import { Router } from "express";

import { asyncHandler, created, ok, parseId } from "../lib/util.js";
import { requires } from "../lib/permissions.js";

// The five calls of a resource (docs/api/master-data.md). `service` has list, get, create, update, remove.
export function crudRouter(service, { read, write }) {
  const router = Router();
  router.get(
    "/",
    requires(read),
    asyncHandler(async (req, res) => {
      const { data, meta } = await service.list(req.query);
      ok(res, data, { meta });
    })
  );
  router.get("/:id", requires(read), asyncHandler(async (req, res) => ok(res, await service.get(parseId(req.params.id)))));
  router.post("/", requires(write), asyncHandler(async (req, res) => created(res, await service.create(req.body ?? {}, req.user))));
  router.put(
    "/:id",
    requires(write),
    asyncHandler(async (req, res) => ok(res, await service.update(parseId(req.params.id), req.body ?? {}, req.user)))
  );
  router.delete(
    "/:id",
    requires(write),
    asyncHandler(async (req, res) => {
      await service.remove(parseId(req.params.id), req.user);
      ok(res, null);
    })
  );
  return router;
}
