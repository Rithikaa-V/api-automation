import { Router, type Response } from 'express';
import type { ZodError } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler } from '../async-handler';
import { sendError } from '../errors';
import { authenticate, authorize } from '../middleware/auth';
import {
  createProductSchema,
  listQuerySchema,
  productIdSchema,
  updateProductSchema,
} from '../validation/schemas';

const router = Router();

const COLUMNS = 'id, name, description, price::float AS price, stock, created_at, updated_at';

const validationError = (res: Response, error: ZodError) =>
  sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', error.flatten());

const notFound = (res: Response) => sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found');

// Search is a literal substring match, so LIKE wildcards in the input are escaped.
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.safeParse(req.query);
    if (!query.success) return validationError(res, query.error);

    const { limit, offset, search } = query.data;
    const filterParams = search ? [`%${escapeLike(search)}%`] : [];
    const where = search ? "WHERE name ILIKE $1 ESCAPE '\\'" : '';
    const next = filterParams.length + 1;

    const [rows, count] = await Promise.all([
      pool.query(`SELECT ${COLUMNS} FROM products ${where} ORDER BY id LIMIT $${next} OFFSET $${next + 1}`, [
        ...filterParams,
        limit,
        offset,
      ]),
      pool.query(`SELECT COUNT(*)::int AS total FROM products ${where}`, filterParams),
    ]);

    return res.json({
      data: rows.rows,
      pagination: { total: count.rows[0].total, limit, offset },
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = productIdSchema.safeParse(req.params.id);
    if (!id.success) return validationError(res, id.error);

    const result = await pool.query(`SELECT ${COLUMNS} FROM products WHERE id = $1`, [id.data]);
    if (result.rowCount === 0) return notFound(res);

    return res.json({ data: result.rows[0] });
  }),
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const body = createProductSchema.safeParse(req.body);
    if (!body.success) return validationError(res, body.error);

    const { name, description, price, stock } = body.data;
    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUMNS}`,
      [name, description, price, stock, req.authUser?.sub],
    );

    const product = result.rows[0];
    return res.status(201).location(`/api/v1/products/${product.id}`).json({ data: product });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const id = productIdSchema.safeParse(req.params.id);
    if (!id.success) return validationError(res, id.error);
    const body = createProductSchema.safeParse(req.body);
    if (!body.success) return validationError(res, body.error);

    const { name, description, price, stock } = body.data;
    const result = await pool.query(
      `UPDATE products
       SET name = $1, description = $2, price = $3, stock = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING ${COLUMNS}`,
      [name, description, price, stock, id.data],
    );
    if (result.rowCount === 0) return notFound(res);

    return res.json({ data: result.rows[0] });
  }),
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const id = productIdSchema.safeParse(req.params.id);
    if (!id.success) return validationError(res, id.error);
    const body = updateProductSchema.safeParse(req.body);
    if (!body.success) return validationError(res, body.error);

    // A single UPDATE with COALESCE, so two concurrent PATCHes cannot overwrite each other's fields.
    const { name, description, price, stock } = body.data;
    const result = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           stock = COALESCE($4, stock),
           updated_at = NOW()
       WHERE id = $5
       RETURNING ${COLUMNS}`,
      [name ?? null, description ?? null, price ?? null, stock ?? null, id.data],
    );
    if (result.rowCount === 0) return notFound(res);

    return res.json({ data: result.rows[0] });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const id = productIdSchema.safeParse(req.params.id);
    if (!id.success) return validationError(res, id.error);

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id.data]);
    if (result.rowCount === 0) return notFound(res);

    return res.status(204).send();
  }),
);

export default router;
