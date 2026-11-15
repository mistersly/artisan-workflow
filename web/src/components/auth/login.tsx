import { useId, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react"
import {
  ArrowLeft,
  Building,
  Check,
  Eye,
  EyeOff,
  Globe,
  Key,
  Lock,
  Mail,
} from "lucide-react"

import { cn } from "@/lib/utils"

export interface LoginCredentials {
  email: string
  password: string
  remember: boolean
}

export interface CreateOrgValues {
  name: string
  slug: string
  adminEmail: string
  adminPassword: string
}

export interface LoginProps {
  onSubmit?: (credentials: LoginCredentials) => Promise<void> | void
  onCreateOrg?: (values: CreateOrgValues) => Promise<void> | void
  className?: string
}

const AUTH_ERROR_MESSAGE =
  "Échec de l'authentification. Vérifiez vos identifiants et réessayez."
const REQUIRED_LOGIN_ERROR =
  "Veuillez renseigner votre adresse e-mail et votre mot de passe."
const REQUIRED_CREATE_ORG_ERROR =
  "Veuillez renseigner tous les champs obligatoires."

const inputClassName =
  "h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
const linkClassName =
  "font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
const iconButtonClassName =
  "grid size-8 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
const submitButtonClassName =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-primary bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70"

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return AUTH_ERROR_MESSAGE
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-sm border border-destructive/30 bg-destructive/10 p-3 px-4 text-sm text-destructive"
    >
      <svg
        className="mt-0.5 size-4.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{message}</span>
    </div>
  )
}

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
  children: ReactNode
}

function Checkbox({ checked, onChange, className, children }: CheckboxProps) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 text-sm text-foreground",
        className,
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.checked)
        }
      />
      <span
        aria-hidden="true"
        className="grid size-4.5 shrink-0 place-items-center rounded-sm border border-border bg-background text-primary-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-foreground peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
      >
        <Check
          strokeWidth={3}
          className={cn(
            "size-3 transition-opacity",
            checked ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
      {children}
    </label>
  )
}

function LogoDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-md bg-background",
        className,
      )}
    >
      <span className="size-3 rounded-sm bg-foreground" />
    </span>
  )
}

function BrandPane() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 text-background lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_80%_-10%,rgba(255,255,255,0.12)_0%,transparent_60%),radial-gradient(600px_400px_at_-10%_110%,rgba(255,255,255,0.08)_0%,transparent_55%)]"
      />

      <div className="relative z-1 flex items-center gap-3 text-xl font-semibold tracking-tight">
        <LogoDot />
        <span>Atrium</span>
      </div>

      <div className="relative z-1 max-w-md">
        <h1 className="mb-4 text-4xl leading-tight font-semibold tracking-tight lg:text-5xl">
          Un accès, tous vos espaces de travail.
        </h1>
        <p className="text-lg leading-relaxed text-background/70">
          Atrium regroupe vos organisations, équipes et projets dans une
          plateforme unique et sécurisée.
        </p>
      </div>

      <div className="relative z-1 flex items-start gap-4 border-t border-background/15 pt-6">
        <div
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-background/10 text-sm font-semibold"
        >
          LM
        </div>
        <div>
          <blockquote className="text-sm leading-relaxed text-background/85">
            « Nous avons centralisé six tenants en une seule interface.
            L'onboarding des nouvelles équipes a chuté de trois jours à vingt
            minutes. »
          </blockquote>
          <cite className="mt-2 block text-xs text-background/50 not-italic">
            Laure Moreau — Directrice des opérations, Studio Nord
          </cite>
        </div>
      </div>
    </aside>
  )
}

function MobileBrand() {
  return (
    <div className="mb-6 flex items-center gap-3 font-semibold lg:hidden">
      <span
        aria-hidden="true"
        className="grid size-6.5 shrink-0 place-items-center rounded-md bg-foreground"
      >
        <span className="size-[11px] rounded-sm bg-background" />
      </span>
      <span className="text-base">Atrium</span>
    </div>
  )
}

function PasswordField({
  id,
  label,
  placeholder,
  autoComplete,
  value,
  onChange,
}: {
  id: string
  label: string
  placeholder: string
  autoComplete: string
  value: string
  onChange: (value: string) => void
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative flex items-center">
        <Lock
          aria-hidden="true"
          className="pointer-events-none absolute left-3 size-4.5 text-muted-foreground"
        />
        <input
          type={showPassword ? "text" : "password"}
          id={id}
          name={id}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClassName, "h-11 rounded-sm border border-border pl-9 pr-10 transition-colors hover:border-foreground/25 focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-foreground")}
        />
        <button
          type="button"
          aria-label={
            showPassword
              ? "Masquer le mot de passe"
              : "Afficher le mot de passe"
          }
          onClick={() => setShowPassword((visible) => !visible)}
          className={cn(iconButtonClassName, "absolute right-1.5")}
        >
          {showPassword ? (
            <EyeOff className="size-4.5" aria-hidden="true" />
          ) : (
            <Eye className="size-4.5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  )
}

function EmailField({
  id,
  label,
  placeholder,
  autoComplete,
  value,
  onChange,
}: {
  id: string
  label: string
  placeholder: string
  autoComplete: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative flex items-center">
        <Mail
          aria-hidden="true"
          className="pointer-events-none absolute left-3 size-4.5 text-muted-foreground"
        />
        <input
          type="email"
          id={id}
          name={id}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClassName, "h-11 rounded-sm border border-border pl-9 pr-3 transition-colors hover:border-foreground/25 focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-foreground")}
        />
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
    />
  )
}

export function Login({ onSubmit, onCreateOrg, className }: LoginProps) {
  const [view, setView] = useState<"login" | "create-org">("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)

  const [orgName, setOrgName] = useState("")
  const [orgSlug, setOrgSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)

  const id = useId()
  const emailId = `${id}-email`
  const passwordId = `${id}-password`
  const orgNameId = `${id}-org-name`
  const orgSlugId = `${id}-org-slug`
  const adminEmailId = `${id}-admin-email`
  const adminPasswordId = `${id}-admin-password`

  const switchView = (next: "login" | "create-org") => {
    setError(null)
    setView(next)
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError(REQUIRED_LOGIN_ERROR)
      return
    }
    setError(null)
    setLoading(true)
    try {
      await onSubmit?.({ email: email.trim(), password, remember })
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateOrgSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!orgName.trim() || !orgSlug.trim() || !adminEmail.trim() || !adminPassword || !agreeTerms) {
      setError(REQUIRED_CREATE_ORG_ERROR)
      return
    }
    setError(null)
    setLoading(true)
    try {
      await onCreateOrg?.({
        name: orgName.trim(),
        slug: slugify(orgSlug) || orgSlug.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword,
      })
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleOrgNameChange(value: string) {
    setOrgName(value)
    if (!slugTouched) setOrgSlug(slugify(value))
  }

  const slugPreview = `${slugify(orgSlug) || "votre-org"}.atrium.app`

  return (
    <div
      className={cn(
        "grid min-h-svh w-full grid-cols-1 bg-background text-foreground lg:grid-cols-2",
        className,
      )}
    >
      <BrandPane />

      <main className="flex items-center justify-center px-4 py-8 sm:px-8">
        {view === "login" ? (
          <div className="w-full max-w-[408px]">
            <MobileBrand />

            <header className="mb-8">
              <h2 className="mb-2 text-3xl font-semibold tracking-tight">
                Connexion
              </h2>
              <p className="text-sm text-muted-foreground">
                Signez avec vos identifiants — vous serez redirigé vers votre
                espace.
              </p>
            </header>

            <ErrorBanner message={error} />

            <form onSubmit={handleLoginSubmit} noValidate>
              <div className="mb-5">
                <EmailField
                  id={emailId}
                  label="Adresse e-mail"
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  value={email}
                  onChange={(value) => {
                    setEmail(value)
                    setError(null)
                  }}
                />
              </div>

              <div className="mb-5">
                <PasswordField
                  id={passwordId}
                  label="Mot de passe"
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  value={password}
                  onChange={(value) => {
                    setPassword(value)
                    setError(null)
                  }}
                />
              </div>

              <div className="mb-6 flex items-center justify-between gap-4">
                <Checkbox
                  checked={remember}
                  onChange={(checked) => {
                    setRemember(checked)
                    setError(null)
                  }}
                >
                  <span>Rester connecté</span>
                </Checkbox>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Mot de passe oublié ?
                </a>
              </div>

              <button
                type="submit"
                aria-busy={loading}
                disabled={loading}
                className={submitButtonClassName}
              >
                {loading && <Spinner />}
                <span className={cn(loading && "opacity-70")}>Se connecter</span>
              </button>

              <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                <span>ou continuer avec</span>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>

              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-sm border border-border bg-background text-sm font-medium text-foreground transition-colors hover:border-foreground/25 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Key className="size-4.5 shrink-0" aria-hidden="true" />
                <span>Authentification unique (SSO)</span>
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <a href="#" className={linkClassName}>
                Demander un accès
              </a>
              <br />
              <button
                type="button"
                onClick={() => switchView("create-org")}
                className={cn(linkClassName, "mt-1")}
              >
                Créer une organisation
              </button>
            </p>
          </div>
        ) : (
          <div className="w-full max-w-[408px]">
            <MobileBrand />

            <header className="mb-8">
              <button
                type="button"
                onClick={() => switchView("login")}
                className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span>Retour à la connexion</span>
              </button>
              <h2 className="mb-2 text-3xl font-semibold tracking-tight">
                Créer une organisation
              </h2>
              <p className="text-sm text-muted-foreground">
                Réservez le sous-domaine de votre nouvelle espace de travail
                sur Atrium.
              </p>
            </header>

            <ErrorBanner message={error} />

            <form onSubmit={handleCreateOrgSubmit} noValidate>
              <div className="mb-5">
                <label htmlFor={orgNameId} className="mb-2 block text-sm font-medium">
                  Nom de l'organisation
                </label>
                <div className="relative flex items-center">
                  <Building
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 size-4.5 text-muted-foreground"
                  />
                  <input
                    type="text"
                    id={orgNameId}
                    name="orgName"
                    placeholder="Studio Nord"
                    autoComplete="organization"
                    autoFocus
                    value={orgName}
                    onChange={(event) => {
                      handleOrgNameChange(event.target.value)
                      setError(null)
                    }}
                    className={cn(inputClassName, "h-11 rounded-sm border border-border pl-9 pr-3 transition-colors hover:border-foreground/25 focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-foreground")}
                  />
                </div>
              </div>

              <div className="mb-5">
                <label htmlFor={orgSlugId} className="mb-2 block text-sm font-medium">
                  Sous-domaine
                </label>
                <div className="flex items-stretch rounded-sm border border-border bg-background transition-colors focus-within:border-foreground focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:ring-foreground">
                  <div className="relative flex min-w-0 flex-1 items-center">
                    <Globe
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 size-4.5 text-muted-foreground"
                    />
                    <input
                      type="text"
                      id={orgSlugId}
                      name="orgSlug"
                      placeholder="studio-nord"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={orgSlug}
                      onChange={(event) => {
                        setOrgSlug(event.target.value)
                        setSlugTouched(true)
                        setError(null)
                      }}
                      className={cn(inputClassName, "h-11 min-w-0 pl-9 pr-3")}
                    />
                  </div>
                  <span className="inline-flex items-center border-l border-border px-4 font-mono text-sm whitespace-nowrap text-muted-foreground">
                    .atrium.app
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Votre espace sera accessible sur{" "}
                  <span className="font-mono text-foreground">{slugPreview}</span>
                </p>
              </div>

              <div className="mb-5">
                <EmailField
                  id={adminEmailId}
                  label="E-mail de l'administrateur"
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  value={adminEmail}
                  onChange={(value) => {
                    setAdminEmail(value)
                    setError(null)
                  }}
                />
              </div>

              <div className="mb-5">
                <PasswordField
                  id={adminPasswordId}
                  label="Mot de passe"
                  placeholder="Créez un mot de passe"
                  autoComplete="new-password"
                  value={adminPassword}
                  onChange={(value) => {
                    setAdminPassword(value)
                    setError(null)
                  }}
                />
              </div>

              <div className="mb-6">
                <Checkbox
                  className="items-start"
                  checked={agreeTerms}
                  onChange={(checked) => {
                    setAgreeTerms(checked)
                    setError(null)
                  }}
                >
                  <span className="leading-normal text-muted-foreground">
                    J'accepte les{" "}
                    <a href="#" className={linkClassName}>
                      conditions d'utilisation
                    </a>{" "}
                    et la{" "}
                    <a href="#" className={linkClassName}>
                      politique de confidentialité
                    </a>
                    .
                  </span>
                </Checkbox>
              </div>

              <button
                type="submit"
                aria-busy={loading}
                disabled={loading}
                className={submitButtonClassName}
              >
                {loading && <Spinner />}
                <span className={cn(loading && "opacity-70")}>
                  Créer l'organisation
                </span>
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Vous avez déjà une organisation ?{" "}
              <button
                type="button"
                onClick={() => switchView("login")}
                className={linkClassName}
              >
                Se connecter
              </button>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default Login
