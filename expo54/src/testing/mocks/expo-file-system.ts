export const directoryCreate = jest.fn();
export const directoryList = jest.fn();

export const fileCreate = jest.fn();
export const fileText = jest.fn();
export const fileWrite = jest.fn();
export const fileDelete = jest.fn();

export class Directory {
    uri: string;
    exists = true;
    create = directoryCreate;
    list = directoryList;

    constructor(...parts: ({ uri: string } | string)[]) {
        this.uri = parts
            .map((part) => typeof part === "string" ? part : part.uri)
            .join("/")
            .replace(/\/{2,}/g, "/")
            .replace("file:/", "file:///");
    }
}

export class File {
    uri: string;
    name: string;
    exists = false;
    create = fileCreate;
    text = fileText;
    write = fileWrite;

    constructor(...parts: ({ uri: string } | string)[]) {
        this.uri = parts
            .map((part) => typeof part === "string" ? part : part.uri)
            .join("/")
            .replace(/\/{2,}/g, "/")
            .replace("file:/", "file:///");

        this.name = this.uri.split("/").at(-1) ?? "";
    }

    delete() {
        fileDelete(this.uri);
    }
}

export const Paths = {
    document: {
        uri: "file:///documents",
    },
};