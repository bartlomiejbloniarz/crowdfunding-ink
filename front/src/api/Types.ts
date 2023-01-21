export type Result<T> = { ok: T} | { err: string }

export type X<T> = {type: "Ok", value: T} | {type: "Err", value: string}

export interface ProjectInfoResponse {
    description: string,
    author: string,
    createTime: string,
    deadline: string,
    goal: number
}

export interface ProjectInfo {
    description: string,
    author: string,
    createTime: Date,
    deadline: Date,
    goal: number
}

export interface ProjectVotes {
    ovrVotedYes: number,
    ovrVotedNo: number
}
