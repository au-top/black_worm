# Black Wrom


## English


This is an independent simulation terminal interface written by typescript and running on nodejs. It supports local startup or network startup (websocket), supports built-in custom commands and publishes by GPL

## Aubot build

compiling typescript with use `babel-cli`

use `pkg` packer

### Running with local nodejs env

```sh

npm i  #OR ``` sh install.sh ``` install dev env

sh make.sh # use babel make to javascript code

```

### Running with no local nodejs env

```sh
# Compiling on an environment with nodejs !
# maybe need edit `pkg.target` field in package.json
# to set the target environment for packaging

npm i  #OR ``` sh install.sh ``` install dev env

sh make.sh # use babel make to javascript code

sh pkg.sh # use pkg  pack to Executable file

```

## Custom command

add `.ts` code file to `src/command/`  in dir 

reference resources `src/command/cd.ts` this is a simple example

is command function type declaration

```typescript
interface CommandRun {
    (
        commandAnalysisList:Array<string>,
        context:CommandContext,
        uiStreamAgg:UIStreamAgg,
        carry?:Record<string,string>[],
        state?:boolean
    ):CommandRunRes
}
```

## new bootstrap program
use any method to guide the program

relevant code in `src/bootstrap.ts`
built-in `localTTYBootstrap` , `networkWsTTYBootstrap`

reference resources `networkWsTTYBootstrap` this is a plug-in multi-user login guide
create you bootstrap add to `src/index.ts`



---




## 中文

这是一个独立的仿真终端接口，由typescript编写，运行在nodejs上。它支持本地启动或网络启动(websocket)，支持内置的自定义命令并通过GPL发布

## 关于构建

使用`babel cli编译typescript`

使用`pkg`打包可执行程序

### 使用本地nodejs 环境运行

```bash

npm i #或``sh install.sh``安装完整开发环境

sh make.sh #使用babel make生成javascript代码

```

### 运行时没有本地nodejs 环境

```bash

# 在nodejs环境下编译！

# 可能需要编辑package.json中的“pkg.target”字段

# 设置打包的目标环境

npm i #或 ``sh install.sh``安装完整开发环境

sh make.sh #使用babel make生成javascript代码

sh pkg.sh #将pkg包用于可执行文件

```

## 自定义命令

将`.ts`代码文件添加到目录中的`src/command/`

参考资源`src/command/cd.ts`这是一个简单的例子

这是命令函数类型声明

```typescript

interface CommandRun {
    (
        commandAnalysisList:Array<string>,
        context:CommandContext,
        uiStreamAgg:UIStreamAgg,
        carry?:Record<string,string>[],
        state?:boolean
    ):CommandRunRes
}

```

## 新引导程序

使用任何方法来引导程序

参考`src/bootstrap.ts`中的代码

内置`localTTYBootstrap` , `networkWsTTYBootstrap`

参考资源`networkWsTTYBootstrap`这是一个多用户登录引导程序

创建并将引导添加到`src/index.ts`