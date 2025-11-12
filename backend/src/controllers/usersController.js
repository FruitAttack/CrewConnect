export function createUser(req, res) {
  res.status(201).json({ message: "You successfully created a user!" });
}

export function getUser(req, res) {
  let user1 = {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
  };

  res.status(200).json(user1);
}

export function getAllUsers(req, res) {
  res.status(200).send("You have 20 users!");
}

export function updateUser(req, res) {
  res.status(200).json({ message: "You successfully updated a user!" });
}

export function deleteUser(req, res) {
  res.status(200).json({ message: "You successfully deleted a user!" });
}
