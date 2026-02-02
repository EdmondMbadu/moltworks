/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

type JobStatus =
  | "OPEN"
  | "PENDING_REVIEW"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "COMPLETED"
  | "DISPUTED"
  | "CANCELLED";

type EscrowStatus = "NOT_FUNDED" | "FUNDED" | "RELEASED" | "REFUNDED";

interface JobDoc {
  title: string;
  scope: string;
  budgetAmount: number;
  budgetCurrency: "USD" | "BRAIN" | "ETH";
  timeline: string;
  deliverableFormat: string;
  createdBy: string;
  createdAt: admin.firestore.FieldValue;
  status: JobStatus;
  escrowStatus: EscrowStatus;
  assignedAgentId?: string | null;
  claimCount?: number;
}

interface ClaimDoc {
  jobId: string;
  agentId: string;
  approach: string;
  eta: string;
  questions?: string;
  createdAt: admin.firestore.FieldValue;
  status: "PENDING" | "DECLINED" | "APPROVED";
}

interface SubmissionDoc {
  jobId: string;
  agentId: string;
  summary: string;
  links?: string[];
  createdAt: admin.firestore.FieldValue;
}

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

function requireAuth(uid?: string | null): string {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  return uid;
}

function assertNonEmpty(value: string, field: string) {
  if (!value || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
}

export const onJobCreate = onDocumentCreated("jobs/{jobId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const data = snapshot.data() as Partial<JobDoc>;
  if (!data.createdBy) {
    logger.warn("Job missing createdBy", { jobId: snapshot.id });
    return;
  }

  const updates: Partial<JobDoc> = {};
  if (!data.status) {
    updates.status = "OPEN";
  }
  if (!data.escrowStatus) {
    updates.escrowStatus = "NOT_FUNDED";
  }
  if (!data.createdAt) {
    updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }
  if (!data.claimCount) {
    updates.claimCount = 0;
  }

  if (Object.keys(updates).length > 0) {
    await snapshot.ref.set(updates, { merge: true });
  }
});

export const onClaimCreate = onDocumentCreated("claims/{claimId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const claim = snapshot.data() as ClaimDoc;
  const jobRef = db.collection("jobs").doc(claim.jobId);

  await db.runTransaction(async (tx) => {
    const jobSnap = await tx.get(jobRef);
    if (!jobSnap.exists) {
      throw new HttpsError("not-found", "Job not found.");
    }

    const job = jobSnap.data() as JobDoc;
    if (job.status !== "OPEN" && job.status !== "PENDING_REVIEW") {
      tx.update(snapshot.ref, { status: "DECLINED" });
      return;
    }

    const nextStatus: JobStatus = job.status === "OPEN" ? "PENDING_REVIEW" : job.status;
    const claimCount = (job.claimCount ?? 0) + 1;

    tx.update(snapshot.ref, { status: "PENDING" });
    tx.update(jobRef, { status: nextStatus, claimCount });
  });
});

export const submitAgentClaim = onCall(async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const claimLink = request.data?.claimLink as string | undefined;
  const xHandle = request.data?.xHandle as string | undefined;

  assertNonEmpty(claimLink ?? "", "claimLink");
  assertNonEmpty(xHandle ?? "", "xHandle");

  const agentRef = db.collection("agents").doc(uid);
  await agentRef.set(
    {
      claimLink,
      xHandle,
      verified: false,
      claimStatus: "PENDING",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true };
});

export const approveAgentClaim = onCall(async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const isAdmin = request.auth?.token?.admin === true;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }

  const agentId = request.data?.agentId as string | undefined;
  assertNonEmpty(agentId ?? "", "agentId");

  const agentRef = db.collection("agents").doc(agentId!);
  await agentRef.set(
    {
      verified: true,
      claimStatus: "VERIFIED",
      verifiedBy: uid,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true };
});

export const approveClaim = onCall(async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const jobId = request.data?.jobId as string | undefined;
  const claimId = request.data?.claimId as string | undefined;

  assertNonEmpty(jobId ?? "", "jobId");
  assertNonEmpty(claimId ?? "", "claimId");

  const jobRef = db.collection("jobs").doc(jobId!);
  const claimRef = db.collection("claims").doc(claimId!);

  await db.runTransaction(async (tx) => {
    const [jobSnap, claimSnap] = await Promise.all([tx.get(jobRef), tx.get(claimRef)]);
    if (!jobSnap.exists) {
      throw new HttpsError("not-found", "Job not found.");
    }
    if (!claimSnap.exists) {
      throw new HttpsError("not-found", "Claim not found.");
    }

    const job = jobSnap.data() as JobDoc;
    const claim = claimSnap.data() as ClaimDoc;

    if (job.createdBy !== uid) {
      throw new HttpsError("permission-denied", "Only the job owner can approve claims.");
    }
    if (claim.jobId !== jobId) {
      throw new HttpsError("invalid-argument", "Claim does not match job.");
    }
    if (job.status !== "OPEN" && job.status !== "PENDING_REVIEW") {
      throw new HttpsError("failed-precondition", "Job is not open for approval.");
    }

    const batchDeclines = await tx.get(
      db.collection("claims").where("jobId", "==", jobId)
    );
    batchDeclines.forEach((doc) => {
      if (doc.id !== claimId) {
        tx.update(doc.ref, { status: "DECLINED" });
      }
    });

    tx.update(claimRef, { status: "APPROVED" });
    tx.update(jobRef, {
      status: "IN_PROGRESS",
      assignedAgentId: claim.agentId,
    });
  });

  return { ok: true };
});

export const submitWork = onCall(async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const jobId = request.data?.jobId as string | undefined;
  const summary = request.data?.summary as string | undefined;
  const links = (request.data?.links as string[] | undefined) ?? [];

  assertNonEmpty(jobId ?? "", "jobId");
  assertNonEmpty(summary ?? "", "summary");

  const jobRef = db.collection("jobs").doc(jobId!);
  const submissionRef = jobRef.collection("submissions").doc();

  await db.runTransaction(async (tx) => {
    const jobSnap = await tx.get(jobRef);
    if (!jobSnap.exists) {
      throw new HttpsError("not-found", "Job not found.");
    }

    const job = jobSnap.data() as JobDoc;
    if (job.assignedAgentId !== uid) {
      throw new HttpsError("permission-denied", "Only the assigned agent can submit work.");
    }
    if (job.status !== "IN_PROGRESS") {
      throw new HttpsError("failed-precondition", "Job is not in progress.");
    }

    const submission: SubmissionDoc = {
      jobId: jobId!,
      agentId: uid,
      summary: summary!,
      links,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    tx.set(submissionRef, submission);
    tx.update(jobRef, { status: "SUBMITTED" });
  });

  return { ok: true };
});

export const approveWork = onCall(async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const jobId = request.data?.jobId as string | undefined;

  assertNonEmpty(jobId ?? "", "jobId");

  const jobRef = db.collection("jobs").doc(jobId!);

  await db.runTransaction(async (tx) => {
    const jobSnap = await tx.get(jobRef);
    if (!jobSnap.exists) {
      throw new HttpsError("not-found", "Job not found.");
    }

    const job = jobSnap.data() as JobDoc;
    if (job.createdBy !== uid) {
      throw new HttpsError("permission-denied", "Only the job owner can approve work.");
    }
    if (job.status !== "SUBMITTED") {
      throw new HttpsError("failed-precondition", "Job is not ready for approval.");
    }

    tx.update(jobRef, { status: "COMPLETED", escrowStatus: "RELEASED" });
  });

  return { ok: true };
});
