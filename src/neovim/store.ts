import {EventEmitter} from 'events';
import Dispatcher from './dispatcher';
import {Kind, ActionType} from './actions';

export interface Size {
    lines: number;
    cols: number;
    width: number;
    height: number;
}

export interface Cursor {
    line: number;
    col: number;
}

export interface FontAttributes {
    fg: string;
    bg: string;
    bold: boolean;
    italic: boolean;
    reverse: boolean;
    underline: boolean;
    undercurl: boolean;
    width: number;
    height: number;
    face: string;
    specified_px: number;
}

export class NeovimStore extends EventEmitter {
    dispatch_token: string;

    size: Size;
    font_attr: FontAttributes;
    fg_color: string;
    bg_color: string;
    cursor: Cursor;
    mode: string;
    busy: boolean;

    constructor() {
        super();
        this.size = {
            lines: 0,
            cols: 0,
            width: 0,
            height: 0,
        };
        this.font_attr = {
            fg: 'white',
            bg: 'black',
            bold: false,
            italic: false,
            reverse: false,
            underline: false,
            undercurl: false,
            width: 1,
            height: 1,
            specified_px: 1,
            face: 'monospace',
        };
        this.cursor = {
            line: 0,
            col: 0,
        };
        this.mode = 'normal';
        this.busy = false;
    }
}

const store = new NeovimStore();
export default store;

// Note: 0x001203 -> '#001203'
function colorString(new_color: number, fallback: string) {
    'use strict';
    if (typeof new_color !== 'number' || new_color < 0) {
        return fallback;
    }

    return '#' + [16, 8, 0].map(shift => {
        const mask = 0xff << shift;
        const hex = ((new_color & mask) >> shift).toString(16);
        return hex.length < 2 ? ('0' + hex) : hex;
    }).join('');
}

store.dispatch_token = Dispatcher.register((action: ActionType) => {
    switch (action.type) {
        case Kind.Input:
            store.emit('input', action.input);
            break;
        case Kind.PutText:
            store.emit('put', action.text);
            store.cursor.col = store.cursor.col + action.text.length;
            store.emit('cursor');
            break;
        case Kind.Cursor:
            store.cursor = {
                line: action.line,
                col: action.col,
            };
            store.emit('cursor');
            break;
        case Kind.Highlight:
            const hl = action.highlight;
            store.font_attr.bold = hl.bold;
            store.font_attr.italic = hl.italic;
            store.font_attr.reverse = hl.reverse;
            store.font_attr.underline = hl.underline;
            store.font_attr.fg = colorString(hl.foreground, store.fg_color);
            store.font_attr.bg = colorString(hl.background, store.bg_color);
            console.log('Highlight is updated: ', store.font_attr);
            break;
        case Kind.Focus:
            store.emit('focus');
            break;
        case Kind.ClearAll:
            store.emit('clear-all');
            store.cursor = {
                line: 0,
                col: 0,
            };
            store.emit('cursor');
            break;
        case Kind.ClearEOL:
            store.emit('clear-eol');
            break;
        case Kind.Resize:
            if (store.size.lines === action.lines
                && store.size.cols === action.cols) {
                break;
            }
            store.size.lines = action.lines;
            store.size.cols = action.cols;
            store.emit('resize');
            break;
        case Kind.UpdateFG:
            store.fg_color = colorString(action.color, store.font_attr.fg);
            store.emit('update-fg');
            console.log('Foreground color is updated: ' + store.fg_color);
            break;
        case Kind.UpdateBG:
            store.bg_color = colorString(action.color, store.font_attr.bg);
            store.emit('update-bg');
            console.log('Background color is updated: ' + store.bg_color);
            break;
        case Kind.Mode:
            store.mode = action.mode;
            store.emit('mode', store.mode);
            break;
        case Kind.BusyStart:
            store.busy = true;
            store.emit('busy');
            break;
        case Kind.BusyStop:
            store.busy = false;
            store.emit('busy');
            break;
        case Kind.UpdateFontSize:
            store.font_attr.width = action.width;
            store.font_attr.height = action.height;
            console.log(`Actual font size is updated: ${action.width}:${action.height}`);
            store.emit('font-size-changed');
            break;
        case Kind.UpdateFontPx:
            store.font_attr.specified_px = action.font_px;
            store.emit('font-px-specified');
            break;
        case Kind.UpdateFontFace:
            store.font_attr.face = action.font_face;
            store.emit('font-face-specified');
            break;
        case Kind.UpdateScreenSize:
            if (store.size.width === action.width
                && store.size.height === action.height) {
                break;
            }
            store.size.width = action.width;
            store.size.height = action.height;
            store.emit('update-screen-size');
            break;
        case Kind.UpdateScreenBounds:
            if (store.size.lines === action.lines
                && store.size.cols === action.cols) {
                break;
            }
            store.size.lines = action.lines;
            store.size.cols = action.cols;
            store.emit('update-screen-bounds');
            break;
        default:
            console.log('Unhandled action: ', action);
            break;
    }
});
