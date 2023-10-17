import type { FallbackProps } from "react-error-boundary";
import { MAIN_STORE_NAME, USER_STORE_NAME } from "@lib/constants";

/**
 * if this function is called, something horribly wrong has happened (maybe an incorrect non-null assertion somewhere).
 * we can no longer trust anything in the store or any other hooks
 */
export default function ErrorFallback(props: FallbackProps) {
    return (
        <div style={{ maxWidth: "45em", margin: "auto" }}>
            <h1>Oops</h1>
            <p>
                If you are seeing this, the program has gone horribly wrong. We
                cannot recover from the error. However, not all hope has lost.
                The choice from here is yours.
            </p>

            <p>In any case, please consider filing a bug report.</p>

            <h2>Option 1: try again</h2>
            <div>
                <p>
                    Re-run the same thing. If this button does nothing, the same
                    error happened again.
                </p>
                <button onClick={props.resetErrorBoundary}>Retry</button>
            </div>

            <h2>Option 2: refresh the page</h2>
            <div>
                <p>
                    If the error does not involve any data-corruption, this
                    should fix it.
                </p>
                <button onClick={window.location.reload}>Refresh</button>
            </div>

            <h2>Option 3: clear some data</h2>
            <div>
                <p>
                    If you have signed-in, your data is still available on the
                    server and can be downloaded again. Otherwise, you can view
                    them here before deleting them.
                </p>

                <div style={{ display: "flex", gap: "1.5em" }}>
                    <button
                        onClick={() => {
                            localStorage.removeItem(MAIN_STORE_NAME);
                            location.reload();
                        }}
                    >
                        Clear interface data
                    </button>

                    <button
                        onClick={() => {
                            localStorage.removeItem(USER_STORE_NAME);
                            location.reload();
                        }}
                    >
                        Clear user data
                    </button>

                    <button
                        onClick={() => {
                            localStorage.removeItem(MAIN_STORE_NAME);
                            localStorage.removeItem(USER_STORE_NAME);
                            location.reload();
                        }}
                    >
                        Clear both
                    </button>
                </div>
            </div>
        </div>
    );
}
