import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("remove abandoned tables", { hours: 1 }, internal.tables.cleanupStale, {});

export default crons;
