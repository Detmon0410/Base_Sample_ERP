import { createContext } from "react";

/**
 * The request counters of the menu: { groups: { <menu group>: { total, items: { <menu item>: count } } } }, how many documents
 * wait for the department of the user. `groups` is empty until the first answer, and stays as it was when a refresh fails.
 */
export const NotificationsContext = createContext({ groups: {} });
