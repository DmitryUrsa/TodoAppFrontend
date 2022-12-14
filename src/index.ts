import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import { logIn, verifyToken } from "./auth/user.js"
import cookieParser from "cookie-parser"
import { getUsers } from "./users.js"
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  updateTaskStatus,
} from "./tasks.js"

const app = express()

app.use(cors())
app.use(cookieParser())

app.post("/login", bodyParser.json(), async (req, res) => {
  console.log("POST")

  const ParsedBody = req.body as {
    login: string
    password: string
  }

  const LoginResult = await logIn({
    login: ParsedBody.login,
    password: ParsedBody.password,
  })
  if (LoginResult.status == "success")
    res.set("Set-Cookie", `token=${LoginResult.message}`)
  res.json(LoginResult)
})

app.get("/authorization", async (req, res, next) => {
  const token = req.cookies.token

  const verifyResult = verifyToken(token)
  console.log(verifyResult)

  if (verifyResult.status === "error") {
    res.status(401).json({
      status: verifyResult.status,
      message: verifyResult.message,
      user: null,
    })
    return
  }

  if (verifyResult.status === "success")
    res.json({
      status: verifyResult.status,
      message: "Авторизиривон успешно",
      user: verifyResult.user,
    })
})

app.get("/logout", async (req, res, next) => {
  res.set("Set-Cookie", `token=`)
  res.json({
    status: "success",
    message: "Вы вышли",
  })
})

app.get("/usersList", async (req, res) => {
  const token = req.cookies.token
  const verifyResult = verifyToken(token)

  if (verifyResult.status === "error") {
    res.status(401).json({
      status: "error",
    })
    return
  }

  if (verifyResult.status === "success") {
    const usersList = await getUsers()
    res.json(usersList)
  }
})

app.post("/createtask", bodyParser.json(), async (req, res) => {
  try {
    const token = req.cookies.token
    const verifyResult = verifyToken(token)

    if (
      verifyResult.status === "error" ||
      verifyResult.user?.role !== "admin"
    ) {
      res.status(401).json({
        status: "Unauthorized",
      })
      return
    }

    if (req.body) {
      const TypedBody = req.body as {
        header: string
        description: string
        priority: string
        assignedUser: string
        endDate: string
        author: string
      }
      const data = {
        header: TypedBody.header,
        description: TypedBody.description,
        priority: TypedBody.priority,
        assignedUser: TypedBody.assignedUser,
        endDate: TypedBody.endDate,
        author: TypedBody.author,
      }
      console.log(data)

      const createTaskResult = await createTask(data)

      res.json(createTaskResult)
    }
  } catch (error) {
    console.log(error)
  }
})

app.get("/gettasks", bodyParser.json(), async (req, res) => {
  const token = req.cookies.token
  const verifyResult = verifyToken(token)

  if (verifyResult.status === "error") {
    {
      res.status(401).json({
        status: "Unauthorized",
      })
      return
    }
  }
  res.json(await getTasks())
})

app.put("/updatetask/:id", bodyParser.json(), async (req, res) => {
  try {
    const token = req.cookies.token
    const verifyResult = verifyToken(token)

    if (verifyResult.status === "error") {
      res.status(401).json({
        status: "Unauthorized",
      })
      return
    }

    if (req.body) {
      const TypedBody = req.body as {
        id: string
        header: string
        description: string
        priority: string
        assignedUser: string
        endDate: string
        author: string
        status: string
      }
      const request = {
        id: req.params.id,
        header: TypedBody.header,
        description: TypedBody.description,
        priority: TypedBody.priority,
        assignedUser: TypedBody.assignedUser,
        endDate: TypedBody.endDate,
        author: TypedBody.author,
        status: TypedBody.status,
      }
      if (verifyResult.user?.role === "admin") {
        const createTaskResult = await updateTask(request)
        res.json(createTaskResult)
      } else {
        const createTaskResult = await updateTaskStatus(
          request.id,
          request.status
        )
        res.json(createTaskResult)
      }
    }
  } catch (error) {
    console.log(error)
  }
})

app.delete("/updatetask/:id", bodyParser.json(), async (req, res) => {
  try {
    const token = req.cookies.token
    const verifyResult = verifyToken(token)

    if (
      verifyResult.status === "error" ||
      verifyResult.user?.role !== "admin"
    ) {
      res.status(401).json({
        status: "Unauthorized",
      })
      return
    }

    if (verifyResult.user?.role === "admin") {
      const createTaskResult = await deleteTask(req.params.id)
      res.json(createTaskResult)
    }
  } catch (error) {
    console.log(error)
  }
})

const port = process.env.PORT || 5000
app.listen(port, () => {
  console.log(`API listening on ${port}`)
})
