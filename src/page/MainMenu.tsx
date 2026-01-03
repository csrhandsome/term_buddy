import React from "react";
import { Box, Text, useInput } from "ink";

export function MainMenu(props: {
  onHost: () => void;
  onJoin: () => void;
  onExit: () => void;
}) {
  useInput((input, key) => {
    if (key.escape || input === "q") props.onExit();
    if (input === "1") props.onHost();
    if (input === "2") props.onJoin();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text>
        {String.raw`
████████╗███████╗██████╗ ███╗   ███╗██████╗ ██╗   ██╗██████╗ ██████╗ ██╗   ██╗
╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██╔══██╗██║   ██║██╔══██╗██╔══██╗╚██╗ ██╔╝
   ██║   █████╗  ██████╔╝██╔████╔██║██████╔╝██║   ██║██║  ██║██║  ██║ ╚████╔╝ 
   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██╔══██╗██║   ██║██║  ██║██║  ██║  ╚██╔╝  
   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██████╔╝╚██████╔╝██████╔╝██████╔╝   ██║   
   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝  ╚═════╝ ╚═════╝ ╚═════╝    ╚═╝   
`}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>Terminal Body Doubling — 极简 / 极客 / 私密</Text>
        <Text> </Text>
        <Text>
          <Text color="cyan">[1]</Text> 建房 (Host)
        </Text>
        <Text>
          <Text color="cyan">[2]</Text> 加入 (Join)
        </Text>
        <Text>
          <Text color="cyan">[q]</Text> 退出
        </Text>
      </Box>
    </Box>
  );
}
