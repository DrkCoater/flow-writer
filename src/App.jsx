import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Theme, Flex, Spinner, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Toolbar } from "./components/Toolbar";
import { EditPanel } from "./components/EditPanel";
import { selectTheme } from "./store/slices/globalSlice";
import { loadDocument, selectLoading, selectError } from "./store/slices/documentSlice";

function App() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  // Load document on mount
  useEffect(() => {
    dispatch(loadDocument());
  }, [dispatch]);

  return (
    <Theme appearance={theme} style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden'
    }}>
      <Toolbar />
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Flex
          direction="column"
          align="center"
          gap="4"
          style={{
            padding: "2rem 4rem",
            width: "100%"
          }}
        >
          <div style={{ width: "100%" }}>
            {loading && (
              <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
                <Spinner size="3" />
              </Flex>
            )}

            {error && (
              <Callout.Root color="red" style={{ marginBottom: "16px" }}>
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  <strong>Error loading document:</strong> {error}
                </Callout.Text>
              </Callout.Root>
            )}

            <EditPanel />
            
          </div>
        </Flex>
      </div>
    </Theme>
  );
}

export default App;
