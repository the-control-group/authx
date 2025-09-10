import React, { useState, useRef, useEffect, } from "react";
import { useMutation } from "@tanstack/react-query";
const mutationFn = async ({ authorityId, email, proof, }) => {
    const result = await fetch("/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query: `
            mutation($authorityId: ID!, $email: String!, $proof: String) {
              authenticateEmail(
                authorityId: $authorityId,
                email: $email,
                proof: $proof
              ) {
                id
                secret
              }
            }
          `,
            variables: {
                authorityId,
                email,
                proof,
            },
        }),
    });
    return result.json();
};
export function EmailAuthority({ authority, setAuthorization, }) {
    // Focus the email field on mount
    const focusElement = useRef(null);
    const [mounted, setMounted] = useState(false);
    if (!mounted)
        setMounted(true);
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        const { current } = focusElement;
        if (!focused && current) {
            current.focus();
            setFocused(true);
        }
    });
    // Email
    const [email, setEmail] = useState("");
    // Proof
    const [proof, setProof] = useState("");
    useEffect(() => {
        const proof = new URL(window.location.href).searchParams.get("proof");
        if (!proof)
            return;
        const payload = proof.split(".")[1];
        if (!payload)
            return;
        try {
            const parsed = JSON.parse(atob(payload));
            if (typeof parsed === "object" &&
                parsed &&
                typeof parsed.email === "string") {
                setEmail(parsed.email);
                setProof(proof);
                const url = new URL(window.location.href);
                url.searchParams.delete("proof");
                window.history.replaceState({}, document.title, url.href);
            }
        }
        catch (error) {
            // Ignore an error here.
        }
    }, []);
    // API and errors
    const mutation = useMutation({
        mutationFn,
        onError(error) {
            setErrors([error.message]);
        },
        onSuccess(result) {
            if (result.errors?.length) {
                // Usually, we would loop through these and display the correct errors
                // by the correct field. This would work in development, but in
                // production, AuthX only returns a single generic authentication
                // failure message, to make it more difficult for an attacker to query
                // for valid email addresses, user IDs, or other information.
                setErrors(result.errors.map((e) => e.message));
                return;
            }
            const authorization = result.data?.authenticateEmail;
            if (!authorization || !authorization.secret) {
                setErrors([
                    "No authorization was returned. Contact your administrator to ensure you have sufficient access to read your own authorizations and authorization secrets.",
                ]);
                return;
            }
            // We have successfully authenticated!
            // Zero the error.
            setErrors([]);
            // Set the authorization.
            setAuthorization({ id: authorization.id, secret: authorization.secret });
        },
    });
    const [errors, setErrors] = useState([]);
    async function onSubmit(e) {
        e.preventDefault();
        if (!email) {
            setErrors(["Please enter an email."]);
            return;
        }
        mutation.mutate({
            authorityId: authority.id,
            email,
            proof,
        });
    }
    return (React.createElement("form", { onSubmit: onSubmit, className: errors.length ? "panel validate" : "panel" },
        React.createElement("label", null,
            React.createElement("span", null, "Email"),
            React.createElement("input", { disabled: mutation.isPending, ref: focusElement, name: "email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true })),
        React.createElement("label", null,
            React.createElement("span", null, "Proof"),
            React.createElement("input", { disabled: mutation.isPending, name: "proof", type: "text", value: proof, onChange: (e) => setProof(e.target.value) })),
        React.createElement("p", null, "If you were sent a code to prove control of this email address, enter it here."),
        !mutation.isPending && errors.length
            ? errors.map((error, i) => (React.createElement("p", { key: i, className: "error" }, error)))
            : null,
        React.createElement("label", null,
            React.createElement("input", { disabled: mutation.isPending, type: "submit", value: mutation.isPending ? "Loading..." : "Submit" }))));
}
export const EmailAuthorityFragment = `
  fragment EmailAuthorityFragment on EmailAuthority {
    __typename
    id
    name
  }
`;
//# sourceMappingURL=EmailAuthority.js.map