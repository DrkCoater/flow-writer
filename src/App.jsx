import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import styled from "@emotion/styled";
import { Theme, Spinner, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Toolbar } from "@/components/Toolbar";
import { EditPanel } from "@/components/EditPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { selectTheme, selectIsEditing, selectIsPreviewing } from "@/store/slices/globalSlice";
import { loadDocument, selectLoading, selectError } from "@/store/slices/documentSlice";
import "@styles/app.scss";

const ThemeWrapper = styled(Theme)`
  height: 100%;
  width: 100%;
  display: block;
`;

function App() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const isEditing = useSelector(selectIsEditing);
  const isPreviewing = useSelector(selectIsPreviewing);

  useEffect(() => {
    dispatch(loadDocument());
  }, [dispatch]);

  const bothActive = isEditing && isPreviewing;
  const neitherActive = !isEditing && !isPreviewing;

  return (
    <ThemeWrapper appearance={theme}>
      <div className="app-container">
        <Toolbar />
        <div className="content-area">
          {loading && (
            <div className="loading-container">
              <Spinner size="3" />
            </div>
          )}

          {error && (
            <Callout.Root color="red" style={{ marginBottom: "1rem" }}>
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {neitherActive && (
            <div className="empty-panel">
              <h3>No Panel Active</h3>
              <p>Click "Edit" or "Preview" in the toolbar to begin.</p>
            </div>
          )}

          <div className={bothActive ? "panels-container both-active" : "panels-container"}>
            {isEditing && <EditPanel />}
            {isPreviewing && <PreviewPanel />}
          </div>
        </div>
      </div>
    </ThemeWrapper>
  );
}

export default App;
