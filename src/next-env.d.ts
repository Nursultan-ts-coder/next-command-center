// The Command Center's code (src/next) is plain JavaScript; these let the TypeScript entry import it.
declare module '@/command-center' {
  const CommandCenterApp: () => JSX.Element;
  export default CommandCenterApp;
}

declare module '*.scss';
