import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "./App"

describe("App", () => {
  it("renders and increments the counter button", async () => {
    render(<App />)

    const button = screen.getByRole("button", { name: /count is/i })
    expect(button).toHaveTextContent("Count is 0")

    await userEvent.click(button)
    expect(button).toHaveTextContent("Count is 1")
  })
})
