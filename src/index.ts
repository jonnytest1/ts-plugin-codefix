import type ts from 'typescript';
import { createTextSpanFromBounds, isForOfStatement, type ForOfStatement, type SourceFile, type VariableDeclarationList } from 'typescript';


type TsWithGetNodePos = typeof ts & {
    getTokenAtPosition(file: SourceFile, pos: number): ts.Node
}



function init({
    typescript: ts,
}: {
    typescript: typeof import("typescript/lib/tsserverlibrary");
}) {

    function create(info: ts.server.PluginCreateInfo) {
        info.project.projectService.logger.info("Hello from remove use state!");

        const proxy: ts.LanguageService = Object.create(null);
        for (let k of Object.keys(info.languageService) as Array<
            keyof ts.LanguageService
        >) {
            const x = info.languageService[k]!;
            // @ts-expect-error - JS runtime trickery which is tricky to type tersely
            proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
        }

        proxy.getEditsForRefactor = (f, format, range, ref, ...args) => {
            if (ref === "convert for of to for loop using index") {
                info.languageService.getCodeFixesAtPosition
                /* return {
                     edits: [{
                         fileName: f,
                         textChanges: [
                             {
                                 span:,
                                 newText: ``
                             }
                         ]
                     }],
                 }*/
            }
            const edits = info.languageService.getEditsForRefactor(
                f, format, range, ref, ...args);
            return edits
        }


        proxy.getCodeFixesAtPosition = (fileName, st, end, ...args) => {
            const refactors = info.languageService.getCodeFixesAtPosition(
                fileName, st, end, ...args
            );
            // const span = ts.createTextSpanFromBounds(st, end)
            const program = info.languageService.getProgram();

            const sourceFile = program?.getSourceFile(fileName)

            info.project.projectService.logger.info(`plugin123: for of check st: ${st}`);
            const node = (ts as TsWithGetNodePos).getTokenAtPosition(sourceFile!, 57);

            // const symbol = checker?.getSymbolAtLocation(node);
            info.project.projectService.logger.info(`plugin123: for of check`);
            if (ts.SyntaxKind.ForKeyword === node.kind) {
                info.project.projectService.logger.info("is for of");

                const forOfStatement = node.parent as ForOfStatement;

                const forOfText = forOfStatement.getFullText()

                const declarationList = forOfStatement.initializer as VariableDeclarationList;

                const declarations = declarationList.declarations
                const listName = forOfStatement.expression.getText()

                const declarationsText = declarations.map(d => `const ${d.name.getFullText()}=${listName}[i];`).join("\n")

                const newForText = forOfText.replace(/for.*{/, forStatement => {
                    return `for (let i=0;i< ${listName}.length;i++){\n${declarationsText}`
                })
                const refactorInfo: ts.CodeFixAction = {
                    fixName: "convert for of to for loop using index",
                    changes: [{
                        fileName: fileName,
                        textChanges: [{
                            span: ts.createTextSpan(forOfStatement.getFullStart(), forOfStatement.getFullText().length),
                            newText: newForText
                        }]
                    }],
                    description: "convert for of to for loop using index",

                    /*actions: [{
                        description: "convert for of to for loop using index",
                        name: "convert for of to for loop using index",
                        //isInteractive: false, 
                        kind: "Quick fix"
    
                    }],*/
                    //inlineable: true,
                }
                debugger
                return [...refactors, refactorInfo];
            } else {

                info.project.projectService.logger.info("not for of" + ts.SyntaxKind[node.kind] + "" + node.kind + " :" + node.getFullText() + ` st: ${st} nd:${end}`);
            }
            return refactors;
        };
        return proxy;

    }
    // Plugin logic will go here

    debugger

    return { create };
}

export = init;