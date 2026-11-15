import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Login } from "./login"

describe("Login", () => {
  it("renders the login form with brand pane", () => {
    render(<Login />)

    expect(screen.getByRole("heading", { name: "Connexion" })).toBeInTheDocument()
    expect(screen.getByText("Un accès, tous vos espaces de travail.")).toBeInTheDocument()
    expect(screen.getByLabelText(/adresse e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Mot de passe", { exact: true })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /se connecter/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /sso/i }),
    ).toBeInTheDocument()
  })

  it("shows an error when submitting empty credentials", async () => {
    const onSubmit = vi.fn()
    render(<Login onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole("button", { name: /se connecter/i }))

    expect(screen.getByRole("alert")).toHaveTextContent(
      /veuillez renseigner votre adresse e-mail/i,
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits credentials and clears the error when fields change", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<Login onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole("button", { name: /se connecter/i }))
    expect(screen.getByRole("alert")).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/adresse e-mail/i), "a@b.fr")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("Mot de passe", { exact: true }), "secret")
    await userEvent.click(screen.getByRole("checkbox"))
    await userEvent.click(screen.getByRole("button", { name: /se connecter/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      email: "a@b.fr",
      password: "secret",
      remember: true,
    })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows the rejection message when onSubmit fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Compte désactivé"))
    render(<Login onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/adresse e-mail/i), "a@b.fr")
    await userEvent.type(screen.getByLabelText("Mot de passe", { exact: true }), "secret")
    await userEvent.click(screen.getByRole("button", { name: /se connecter/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Compte désactivé")
    expect(
      screen.getByRole("button", { name: /se connecter/i }),
    ).toBeEnabled()
  })

  it("toggles password visibility", async () => {
    render(<Login />)

    const password = screen.getByLabelText("Mot de passe", { exact: true })
    const toggle = screen.getByRole("button", { name: /afficher le mot de passe/i })

    expect(password).toHaveAttribute("type", "password")
    await userEvent.click(toggle)
    expect(password).toHaveAttribute("type", "text")
    expect(
      screen.getByRole("button", { name: /masquer le mot de passe/i }),
    ).toBeInTheDocument()
  })

  it("switches to the create-organization view and back", async () => {
    render(<Login />)

    await userEvent.click(screen.getByRole("button", { name: /^créer une organisation$/i }))

    expect(
      screen.getByRole("heading", { name: /créer une organisation/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/nom de l'organisation/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sous-domaine/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /retour à la connexion/i }))
    expect(screen.getByRole("heading", { name: "Connexion" })).toBeInTheDocument()
  })

  it("auto-fills the slug from the organization name and previews it", async () => {
    render(<Login />)

    await userEvent.click(screen.getByRole("button", { name: /^créer une organisation$/i }))
    await userEvent.type(screen.getByLabelText(/nom de l'organisation/i), "Studio Nord!")

    expect(screen.getByLabelText(/sous-domaine/i)).toHaveValue("studio-nord")
    expect(screen.getByText("studio-nord.atrium.app")).toBeInTheDocument()
  })

  it("shows an error when the create-organization form is incomplete", async () => {
    const onCreateOrg = vi.fn()
    render(<Login onCreateOrg={onCreateOrg} />)

    await userEvent.click(screen.getByRole("button", { name: /^créer une organisation$/i }))
    await userEvent.click(screen.getByRole("button", { name: /créer l'organisation/i }))

    expect(screen.getByRole("alert")).toHaveTextContent(/tous les champs/i)
    expect(onCreateOrg).not.toHaveBeenCalled()
  })

  it("submits the create-organization form", async () => {
    const onCreateOrg = vi.fn().mockResolvedValue(undefined)
    render(<Login onCreateOrg={onCreateOrg} />)

    await userEvent.click(screen.getByRole("button", { name: /^créer une organisation$/i }))
    await userEvent.type(screen.getByLabelText(/nom de l'organisation/i), "Studio Nord")
    await userEvent.type(screen.getByLabelText(/e-mail de l'administrateur/i), "a@b.fr")
    await userEvent.type(screen.getByLabelText("Mot de passe", { exact: true }), "secret")
    await userEvent.click(screen.getByRole("checkbox"))
    await userEvent.click(screen.getByRole("button", { name: /créer l'organisation/i }))

    expect(onCreateOrg).toHaveBeenCalledWith({
      name: "Studio Nord",
      slug: "studio-nord",
      adminEmail: "a@b.fr",
      adminPassword: "secret",
    })
  })

  it("submits a slugified value when the user edits the subdomain manually", async () => {
    const onCreateOrg = vi.fn().mockResolvedValue(undefined)
    render(<Login onCreateOrg={onCreateOrg} />)

    await userEvent.click(screen.getByRole("button", { name: /^créer une organisation$/i }))
    await userEvent.type(screen.getByLabelText(/nom de l'organisation/i), "Studio Nord")
    const slugField = screen.getByLabelText(/sous-domaine/i)
    await userEvent.clear(slugField)
    await userEvent.type(slugField, "Studio Nord!")
    await userEvent.type(screen.getByLabelText(/e-mail de l'administrateur/i), "a@b.fr")
    await userEvent.type(screen.getByLabelText("Mot de passe", { exact: true }), "secret")
    await userEvent.click(screen.getByRole("checkbox"))
    await userEvent.click(screen.getByRole("button", { name: /créer l'organisation/i }))

    expect(onCreateOrg).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "studio-nord" }),
    )
  })
})
