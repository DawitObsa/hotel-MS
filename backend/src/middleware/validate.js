export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: 'Please check the submitted fields.', details: result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })) });
    req.validatedBody = result.data;
    next();
  };
}
