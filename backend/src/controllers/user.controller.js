import * as userService from "../services/user.service.js";

export async function getUsers(req, res, next) {
  try {
    const users = await userService.getUsers();

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req, res, next) {
  try {
    const id = Number(req.params.id);

    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "USER_NOT_FOUND"
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);

    res.status(201).json({
      success: true,
      data: user,
      message: "User created successfully"
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const id = Number(req.params.id);

    const user = await userService.updateUser(id, req.body);

    res.json({
      success: true,
      data: user,
      message: "User updated successfully"
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const id = Number(req.params.id);

    await userService.deleteUser(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
