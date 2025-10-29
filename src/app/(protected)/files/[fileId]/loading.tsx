import styles from "./styles.module.css";
import { LoadingSpinner } from "@/components/loading";

/**
 * @component FilesLoading
 * @description Loading UI displayed via Suspense while the FilesPage data is loading.
 */
export default function FilesLoading() {
    return (
        <div>
            <LoadingSpinner text="Loading metadata..." size="medium" />
        </div>
    );
}
