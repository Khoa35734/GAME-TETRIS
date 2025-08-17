import express, { Express, Request, Response } from 'express';

const app: Express = express();
const PORT = process.env.PORT || 4000;

app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "Hello from Tetris Server!" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});