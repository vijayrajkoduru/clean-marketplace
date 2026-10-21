import { startTransition, type FormEvent } from "react";

/**
 * Submit handler for forms backed by useActionState.
 *
 * React clears a form's typed-in values after a form action runs. That is wrong when the
 * server answers with an error, because the customer has to type everything again. This
 * handler sends the same FormData without that reset:
 *
 *   <form onSubmit={submitKeepingValues(dispatch)}>
 */
export function submitKeepingValues(dispatch: (form: FormData) => void, before?: (e: FormEvent<HTMLFormElement>) => boolean | void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (before && before(e) === false) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(data));
  };
}
