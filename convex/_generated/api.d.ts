/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as artifacts from "../artifacts.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as projectMembers from "../projectMembers.js";
import type * as projectResources from "../projectResources.js";
import type * as projects from "../projects.js";
import type * as ticketWorkflow from "../ticketWorkflow.js";
import type * as tickets from "../tickets.js";
import type * as users from "../users.js";
import type * as utils_projectAccess from "../utils/projectAccess.js";
import type * as validationRuns from "../validationRuns.js";
import type * as validations from "../validations.js";
import type * as workflowEngine from "../workflowEngine.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  artifacts: typeof artifacts;
  auth: typeof auth;
  http: typeof http;
  jobs: typeof jobs;
  projectMembers: typeof projectMembers;
  projectResources: typeof projectResources;
  projects: typeof projects;
  ticketWorkflow: typeof ticketWorkflow;
  tickets: typeof tickets;
  users: typeof users;
  "utils/projectAccess": typeof utils_projectAccess;
  validationRuns: typeof validationRuns;
  validations: typeof validations;
  workflowEngine: typeof workflowEngine;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
