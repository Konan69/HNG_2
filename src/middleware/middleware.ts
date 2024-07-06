export const validateUser = (schema: any) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((err: any) => ({
        field: err.context.key,
        message: err.message,
      }));

      return res.status(422).json({ errors });
    }

    next();
  };
};
