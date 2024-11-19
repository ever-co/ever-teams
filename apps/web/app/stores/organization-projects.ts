import { atom } from "jotai";
import { IProject } from "../interfaces";

export const organizationProjectsState = atom<IProject[]>([])
