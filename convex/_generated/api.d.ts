/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as ai from "../ai.js";
import type * as aiHackathon from "../aiHackathon.js";
import type * as brandKits from "../brandKits.js";
import type * as canvas from "../canvas.js";
import type * as chat from "../chat.js";
import type * as files from "../files.js";
import type * as heroImage from "../heroImage.js";
import type * as heroImageRefine from "../heroImageRefine.js";
import type * as http from "../http.js";
import type * as products from "../products.js";
import type * as profiles from "../profiles.js";
import type * as projects from "../projects.js";
import type * as shares from "../shares.js";
import type * as stats from "../stats.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  ai: typeof ai;
  aiHackathon: typeof aiHackathon;
  brandKits: typeof brandKits;
  canvas: typeof canvas;
  chat: typeof chat;
  files: typeof files;
  heroImage: typeof heroImage;
  heroImageRefine: typeof heroImageRefine;
  http: typeof http;
  products: typeof products;
  profiles: typeof profiles;
  projects: typeof projects;
  shares: typeof shares;
  stats: typeof stats;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
