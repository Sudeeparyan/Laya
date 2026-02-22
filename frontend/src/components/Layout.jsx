export default function Layout({ left, center, right }) {
  return (
    <div className="layout-3panel">
      {left}
      {center}
      {right}
    </div>
  );
}
