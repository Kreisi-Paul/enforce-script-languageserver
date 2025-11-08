import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    HoverParams,
    Hover,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";

let connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion.
            completionProvider: {
                resolveProvider: true
            },
            hoverProvider: true
        }
    };
    return result;
});

connection.onInitialized(() => {
    connection.console.log("Initialized.")
});

// Only keep settings for open documents
documents.onDidClose(e => {
    connection.console.log("Document closed.")
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    connection.console.log("Document content changed.")
    validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    // In this simple example we get the settings for every validate run.
    // The validator creates diagnostics for all uppercase words length 2 and more
    let text = textDocument.getText();
    let pattern = /\b[A-Z]{2,}\b/g;
    let m: RegExpExecArray | null;

    let problems = 0;
    let diagnostics: Diagnostic[] = [];
    while ((m = pattern.exec(text))) {
        problems++;
        let diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Warning,
            range: {
                start: textDocument.positionAt(m.index),
                end: textDocument.positionAt(m.index + m[0].length)
            },
            message: `${m[0]} is all uppercase.`,
            source: "ex"
        };
        if (hasDiagnosticRelatedInformationCapability) {
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: "Spelling matters"
                },
                {
                    location: {
                        uri: textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: "Particularly for names"
                }
            ];
        }
        diagnostics.push(diagnostic);
    }

    // Send the computed diagnostics to VS Code.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
    // Monitored files have change in VS Code
    connection.console.log("We received a file change event");
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
        // The pass parameter contains the position of the text document in
        // which code complete got requested. For the example we ignore this
        // info and always provide the same completion items.
        return [
            {
                label: "TypeScript",
                kind: CompletionItemKind.Text,
                data: 1
            },
            {
                label: "JavaScript",
                kind: CompletionItemKind.Text,
                data: 2
            }
        ];
    }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        if (item.data === 1) {
            item.detail = "TypeScript details";
            item.documentation = "TypeScript documentation";
        } else if (item.data === 2) {
            item.detail = "JavaScript details";
            item.documentation = "JavaScript documentation";
        }
        return item;
    }
);

connection.onHover((params: HoverParams): Hover | undefined => {
    connection.console.log("hover ")
    const { textDocument, position } = params;


    const document = documents.get(textDocument.uri);
    if (!document) return;

    return {
        contents: {
            kind: 'markdown',
            value: `**HALLO**\n\nThis is a hover tooltip for \`HALLO\`.`
        }
    };
});


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
