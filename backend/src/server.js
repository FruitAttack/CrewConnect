import express from "express";
import usersRoutes from "./routes/usersRoutes.js"

const app = express();
app.use(express.json());

app.use("/api/users", usersRoutes);

app.listen(5001, () => {
  console.log("Server started on PORT: 5001");
});