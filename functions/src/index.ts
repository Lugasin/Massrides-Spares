import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";
import * as crypto from "crypto";
import { timingSafeEqual } from "crypto"; // Import timingSafeEqual
import { CallableContext } from "firebase-functions/v1/https"; // Import CallableContext
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier"; // Import DecodedIdToken
import axios from 'axios'; // Import axios

// Extend the Express Request type to include the 'user' property
declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken; // Add the user property with the type of a decoded Firebase ID token
    }
  }
}

admin.initializeApp();
const db = admin.firestore(); // Initialize Firestore

// Define interface for setRole function data
interface SetRoleData {
    uid: string;
    role: string;
}

// Callable function to set custom user roles
export const setRole = functions.https.onCall(async (data: SetRoleData, context: CallableContext) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Only authenticated users can set roles."
    );
  }

  // Get the authenticated user's UID and check for super_admin role claim
  const callerUid = context.auth.uid;
  const callerClaims = context.auth.token;

  if (!(callerClaims as any).role || (callerClaims as any).role !== "super_admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only super_admins can set roles."
  