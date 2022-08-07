import type { NextPage } from "next"
import Header from "../components/header"
import Login from "../components/login"
import { useUser } from "../hooks/useUser"
import DatePicker, { registerLocale, setDefaultLocale } from "react-datepicker"
import { useState, useEffect, SetStateAction } from "react"
import "react-datepicker/dist/react-datepicker.css"
import ru from "date-fns/locale/ru"
import { Button, Modal } from "react-daisyui"
import { User } from "@prisma/client"
registerLocale("ru", ru)

function InputField({
  label = "",
  placeholder = "",
  name = "",
  type = "input",
  value = "",
}) {
  return (
    <div className="form-control w-full mb-6">
      <label className="label">
        <span className="label-text">{label}</span>
      </label>
      {type == "input" ? (
        <input
          type="text"
          placeholder={placeholder}
          className="input input-bordered w-full"
          name={name}
          value={value}
        />
      ) : null}
      {type == "textarea" ? (
        <textarea
          placeholder={placeholder}
          className="textarea textarea-bordered w-full"
          name={name}
          value={value}
        />
      ) : null}
    </div>
  )
}

type DBUser = {
  first_name: string
  second_name: string
  login: string
  id: number
}

function TaskItem({ task, editTask }: any) {
  let priorityClass = ""
  if (task.priority == 1) priorityClass = "bg-red-200 text-red-700"
  if (task.priority == 2) priorityClass = "bg-orange-200 text-orange-700"
  if (task.priority == 3) priorityClass = "bg-cyan-200 text-cyan-700"

  return (
    <li
      className="mb-4 bg-base-100 hover:bg-base-300 rounded p-4 cursor-pointer"
      onClick={() => editTask(task)}
    >
      {/* <p className="mb-2">
        {task.assigned_user.first_name} {task.assigned_user.second_name}
      </p> */}
      <h4 className="mb-2">{task.title}</h4>
      <div
        className={`mb-2 text-xs inline-flex items-center uppercase px-3 py-1 rounded-full ${priorityClass}`}
      >
        Приоритет {task.priority}
      </div>
      <p className="text-xs">
        Дата окончания: <b className="text-red-500">{task.end_date}</b>
      </p>
    </li>
  )
}
function TasksList({
  tasks,
  groupBy = "lastUpdated",
  userID,
  editTask = null,
}: {
  tasks: any[]
  groupBy: string
  userID: number | null
  editTask: any
}) {
  if (groupBy == "assignedUser") {
    const users = tasks.map((task) => ({
      id: task.assigned_user.id,
      name: `${task.assigned_user.first_name} ${task.assigned_user.second_name}`,
    }))
    const uniqueUsers = [
      ...new Map(users.map((item) => [item["id"], item])).values(),
    ]
    return uniqueUsers.map((user) => {
      return (
        <div className="mb-4" key={`user-tasks-${user.id}`}>
          <h3 className="font-bold">Задачи для {user.name}</h3>
          <ul>
            {tasks
              .filter((task) => task.assigned_user.id == user.id)
              .sort((a, b) => (a.priority > b.priority ? 1 : -1))
              .map((task) => {
                return (
                  <TaskItem
                    key={`task-${task.id}`}
                    task={task}
                    editTask={editTask}
                  />
                )
              })}
          </ul>
        </div>
      )
    })
  }

  if (groupBy == "user" && userID) {
    return (
      <ul>
        {tasks
          .filter((task) => task.assigned_user.id == userID)
          .sort((a, b) => (a.end_date > b.end_date ? 1 : -1))
          .map((task) => {
            return (
              <TaskItem
                key={`task-${task.id}`}
                task={task}
                editTask={editTask}
              />
            )
          })}
      </ul>
    )
  }

  if (groupBy == "lastUpdated") {
    return (
      <ul>
        {tasks.map((task) => {
          return (
            <TaskItem key={`task-${task.id}`} task={task} editTask={editTask} />
          )
        })}
      </ul>
    )
  }

  return null
}

async function fetchTasks() {
  const responce = await fetch("/serverapi/gettasks")
  const tasks = await responce.json()
  return tasks
}

function TaskForm({
  updateTasks,
  user,
  currentTaskDataFill = null,
  flushTaskData,
}: {
  updateTasks: any
  user: any
  currentTaskDataFill?: any
  flushTaskData: any
}) {
  const [endDate, setEndDate] = useState(new Date())
  const [usersList, setUsersList] = useState<DBUser[] | []>([])
  const [currentTaskData, setCurrentTaskData] = useState(currentTaskDataFill)
  const [headerField, setHeaderField] = useState(currentTaskData?.title)
  const [descriptionField, setDescriptionField] = useState(
    currentTaskData?.description
  )

  useEffect(() => {
    async function getUsers() {
      const responce = await fetch("/serverapi/usersList")
      const usersList = await responce.json()

      setUsersList(usersList)
    }

    getUsers()
  }, [])

  useEffect(() => {
    setCurrentTaskData(currentTaskDataFill)
    setEndDate(
      currentTaskDataFill?.end_date
        ? new Date(currentTaskDataFill.end_date)
        : new Date()
    )
    setHeaderField(currentTaskDataFill?.title)
    setDescriptionField(currentTaskDataFill?.description)
  }, [currentTaskDataFill])

  async function handleTaskCreate(event: React.SyntheticEvent) {
    event.preventDefault()
    const target = event.target as typeof event.target & {
      header: { value: string }
      description: { value: string }
      priority: { value: string }
      assignedUser: { value: string }
      endDate: { value: string }
    }
    const responce = await fetch("/serverapi/createtask", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        header: headerField,
        description: descriptionField,
        priority: target.priority.value,
        assignedUser: target.assignedUser.value,
        endDate: endDate,
        author: user.id,
      }),
    })
    const content = (await responce.json()) as
      | { status: string; message: string }
      | undefined
    console.log(content)

    updateTasks()
  }
  async function handleTaskUpdate(event: React.SyntheticEvent) {
    event.preventDefault()
    const target = event.target as typeof event.target & {
      header: { value: string }
      description: { value: string }
      priority: { value: string }
      assignedUser: { value: string }
      endDate: { value: string }
      status: { value: string }
    }
    const preparedBody = {
      header: headerField,
      description: descriptionField,
      priority: target.priority.value,
      assignedUser: target.assignedUser.value,
      endDate: endDate,
      author: user.id,
      status: target.status.value,
    }

    const responce = await fetch(
      `/serverapi/updatetask/${currentTaskData.id}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preparedBody),
      }
    )
    const content = (await responce.json()) as
      | { status: string; message: string }
      | undefined
    console.log(`content`, content)

    updateTasks()
  }
  if (currentTaskData)
    return (
      <div className="w-full p-6 bg-base-200 rounded drop-shadow-xl mx-auto">
        <form onSubmit={handleTaskUpdate}>
          <h1 className="text-xl text-neutral-content font-bold mb-2">
            {currentTaskData ? "Редактировать" : "Создать"} задачу
          </h1>
          {currentTaskData ? (
            <Button onClick={flushTaskData}>Закрыть редактирование</Button>
          ) : null}

          <div className="form-control w-full mb-6">
            <label className="label">
              <span className="label-text">Заголовок</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              name={`header`}
              value={headerField}
              onChange={(e) => setHeaderField(e.target.value)}
            />
          </div>

          <div className="form-control w-full mb-6">
            <label className="label">
              <span className="label-text">Описание</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              name={`description`}
              value={descriptionField}
              onChange={(e) => setDescriptionField(e.target.value)}
            />
          </div>

          <InputField
            label="Описание"
            name="description"
            type="textarea"
            value={currentTaskData?.description ?? undefined}
          />

          <div className="form-control w-full mb-6">
            <label className="label">
              <span className="label-text">Дата окончания</span>
            </label>
            <DatePicker
              selected={endDate}
              onChange={(date: Date) => setEndDate(date)}
              showTimeSelect
              locale="ru"
              timeCaption="Время"
              className="input input-bordered w-full"
              dateFormat="d MMMM, yyyy h:mm"
            />
          </div>

          <div className="form-control w-full mb-6">
            <label className="label">
              <span className="label-text">Приоритет</span>
            </label>
            <select name="status" className="select w-full">
              <option
                disabled
                value={0}
                selected={!currentTaskData ? true : undefined}
              >
                Статус
              </option>
              <option
                value={"pending"}
                selected={
                  currentTaskData?.status == "pending" ? true : undefined
                }
              >
                Ожидает
              </option>
              <option
                value={"started"}
                selected={
                  currentTaskData?.status == "started" ? true : undefined
                }
              >
                Выполняется
              </option>
              <option
                value={"finished"}
                selected={
                  currentTaskData?.status == "finished" ? true : undefined
                }
              >
                Готово
              </option>
            </select>
          </div>

          <div className="form-control w-full mb-6">
            <label className="label">
              <span className="label-text">Приоритет</span>
            </label>
            <select name="priority" className="select w-full">
              <option
                disabled
                value={0}
                selected={!currentTaskData ? true : undefined}
              >
                Выберите приоритет задачи
              </option>
              <option
                value={1}
                selected={currentTaskData?.priority == 1 ? true : undefined}
              >
                Высокий
              </option>
              <option
                value={2}
                selected={currentTaskData?.priority == 2 ? true : undefined}
              >
                Средний
              </option>
              <option
                value={3}
                selected={currentTaskData?.priority == 3 ? true : undefined}
              >
                Низкий
              </option>
            </select>
          </div>

          <div className="form-control w-full mb-6">
            <label className="label">
              <span className="label-text">Ответственный</span>
            </label>
            <select name="assignedUser" className="select w-full">
              <option disabled selected value={0}>
                Выберите ответственного
              </option>
              {usersList.map((user) => (
                <option
                  value={user.id}
                  key={user.id}
                  selected={
                    currentTaskData?.assigned_user?.id == user.id
                      ? true
                      : undefined
                  }
                >{`${user.first_name} ${user.second_name}`}</option>
              ))}
            </select>
          </div>

          <div className="text-center">
            <button type="submit" className="btn">
              Отредактировать
            </button>
          </div>
        </form>
      </div>
    )

  return (
    <div className="w-full p-6 bg-base-200 rounded drop-shadow-xl mx-auto">
      <form onSubmit={handleTaskCreate}>
        <h1 className="text-xl text-neutral-content font-bold mb-2">
          Создать задачу
        </h1>

        <InputField label="Заголовок" name="header" />
        <InputField label="Описание" name="description" type="textarea" />

        <div className="form-control w-full mb-6">
          <label className="label">
            <span className="label-text">Дата окончания</span>
          </label>
          <DatePicker
            selected={endDate}
            onChange={(date: Date) => setEndDate(date)}
            showTimeSelect
            locale="ru"
            timeCaption="Время"
            className="input input-bordered w-full"
            dateFormat="d MMMM, yyyy h:mm"
          />
        </div>

        <div className="form-control w-full mb-6">
          <label className="label">
            <span className="label-text">Приоритет</span>
          </label>
          <select name="priority" className="select w-full">
            <option
              disabled
              value={0}
              selected={!currentTaskData ? true : undefined}
            >
              Статус
            </option>
            <option
              value={1}
              selected={currentTaskData?.status == "pending" ? true : undefined}
            >
              Ожидает
            </option>
            <option
              value={2}
              selected={currentTaskData?.status == "started" ? true : undefined}
            >
              Выполняется
            </option>
            <option
              value={3}
              selected={
                currentTaskData?.status == "finished" ? true : undefined
              }
            >
              Готово
            </option>
          </select>
        </div>

        <div className="form-control w-full mb-6">
          <label className="label">
            <span className="label-text">Приоритет</span>
          </label>
          <select name="priority" className="select w-full">
            <option disabled value={0} selected>
              Выберите приоритет задачи
            </option>
            <option value={1}>Высокий</option>
            <option value={2}>Средний</option>
            <option value={3}>Низкий</option>
          </select>
        </div>

        <div className="form-control w-full mb-6">
          <label className="label">
            <span className="label-text">Ответственный</span>
          </label>
          <select name="assignedUser" className="select w-full">
            <option disabled selected value={0}>
              Выберите ответственного
            </option>
            {usersList.map((user) => (
              <option
                value={user.id}
                key={user.id}
              >{`${user.first_name} ${user.second_name}`}</option>
            ))}
          </select>
        </div>

        <div className="text-center">
          <button type="submit" className="btn">
            Создать задачу
          </button>
        </div>
      </form>
    </div>
  )
}

const Home: NextPage = () => {
  const { user, mutateUser } = useUser()
  const [tasksList, setTasksList] = useState([])
  const [tasksListSortType, setTasksListSortType] = useState("user")
  const [editTaskData, setEditTaskData] = useState(null)
  const [visible, setVisible] = useState<boolean>(false)

  function toggleVisible() {
    setVisible(!visible)
  }

  function showAddTask() {
    flushTaskData()
    toggleVisible()
  }

  async function updateTasks() {
    setTasksList(await fetchTasks())
  }

  async function editTask(task: any) {
    console.log("edit task!", task)
    setEditTaskData(task)
    toggleVisible()
  }
  function flushTaskData() {
    setEditTaskData(null)
  }

  useEffect(() => {
    updateTasks()
  }, [])

  console.log(`user changed`, user)
  if (!user.isLoggedIn) return <Login mutateUser={mutateUser} />

  return (
    <>
      <div>
        <Header mutateUser={mutateUser} />
        <div className="w-full p-6 bg-base-200 rounded drop-shadow-xl mx-auto">
          <Button onClick={toggleVisible}>Создать задачу</Button>

          <div className="tabs mb-4">
            <a
              className={`tab tab-bordered ${
                tasksListSortType == "user" && "tab-active"
              }`}
              onClick={() => setTasksListSortType("user")}
            >
              Ваши задачи
            </a>
            <a
              className={`tab tab-bordered ${
                tasksListSortType == "assignedUser" && "tab-active"
              }`}
              onClick={() => setTasksListSortType("assignedUser")}
            >
              По ответственным
            </a>
            <a
              className={`tab tab-bordered ${
                tasksListSortType == "lastUpdated" && "tab-active"
              }`}
              onClick={() => setTasksListSortType("lastUpdated")}
            >
              Без группировок
            </a>
          </div>
          <TasksList
            tasks={tasksList}
            groupBy={tasksListSortType}
            userID={user.id}
            editTask={editTask}
          />
        </div>
      </div>
      <Modal open={visible}>
        <Button
          size="sm"
          shape="circle"
          className="absolute right-2 top-2"
          onClick={showAddTask}
        >
          ✕
        </Button>

        <Modal.Body className="mt-9">
          <TaskForm
            updateTasks={updateTasks}
            user={user}
            currentTaskDataFill={editTaskData}
            flushTaskData={flushTaskData}
          />
        </Modal.Body>
      </Modal>
    </>
  )
}

export default Home
