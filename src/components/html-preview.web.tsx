/** Browser preview of the generated claim pack, shown inline. */
export function HtmlPreview({ html }: { html: string }) {
  return (
    <iframe
      title="Claim pack preview"
      srcDoc={html}
      sandbox=""
      style={{ width: '100%', height: 720, border: 'none', background: '#fff', borderRadius: 16 }}
    />
  );
}
