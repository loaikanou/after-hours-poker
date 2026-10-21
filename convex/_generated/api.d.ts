/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as model_cards from "../model/cards.js";
import type * as model_errors from "../model/errors.js";
import type * as model_poker from "../model/poker.js";
import type * as model_state from "../model/state.js";
import type * as model_trick from "../model/trick.js";
import type * as model_types from "../model/types.js";
import type * as tables from "../tables.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  "model/cards": typeof model_cards;
  "model/errors": typeof model_errors;
  "model/poker": typeof model_poker;
  "model/state": typeof model_state;
  "model/trick": typeof model_trick;
  "model/types": typeof model_types;
  tables: typeof tables;
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
