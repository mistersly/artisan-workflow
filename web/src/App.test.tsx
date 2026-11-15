import { render, screen } from "@testing-library/react"
import App from "./App"

describe("App", () => {
  it("renders the login screen", () => {
    render(<App />)

    expect(
      screen.getByRole("heading", { name: "Connexion" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /se connecter/i }),
    ).toBeInTheDocument()
  })
})
