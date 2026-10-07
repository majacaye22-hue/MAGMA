import ExplorarPage from "./explorar/page";

export default function HomePage(props: Parameters<typeof ExplorarPage>[0]) {
  return (
    <>
      <span hidden data-homepage-pixel />
      <ExplorarPage {...props} />
    </>
  );
}
