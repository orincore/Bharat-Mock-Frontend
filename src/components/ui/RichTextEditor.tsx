"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TEXT_COLORS = [
  { label: "Default", value: "#111827" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Green", value: "#15803d" },
  { label: "Orange", value: "#d97706" },
  { label: "Red", value: "#b91c1c" },
  { label: "Purple", value: "#7c3aed" }
];

const HIGHLIGHT_COLORS = [
  { label: "None", value: "" },
  { label: "Lemon", value: "#fef3c7" },
  { label: "Sun", value: "#fde68a" },
  { label: "Mint", value: "#d1fae5" },
  { label: "Sky", value: "#bae6fd" },
  { label: "Blush", value: "#fecdd3" }
];

const FONT_FAMILIES = [
  { label: "Default", value: "inherit" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Nunito", value: "Nunito, sans-serif" },
  { label: "Source Serif", value: '"Source Serif Pro", serif' },
  { label: "Space Mono", value: '"Space Mono", monospace' },
  { label: "Poppins", value: '"Poppins", sans-serif' }
];

export type RichTextEditorVariant = "full" | "compact";

interface RichTextEditorProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  variant?: RichTextEditorVariant;
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Start typing...",
  rows = 4,
  className = "",
  label,
  helperText,
  disabled = false,
  variant = "full"
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    code: false,
    link: false,
    color: TEXT_COLORS[0].value,
    highlight: "",
    font: FONT_FAMILIES[0].value
  });

  useEffect(() => {
    if (!editorRef.current) return;
    const sanitizedValue = value || "";
    if (editorRef.current.innerHTML !== sanitizedValue) {
      editorRef.current.innerHTML = sanitizedValue;
    }
  }, [value]);

  const isSelectionInside = () => {
    if (typeof window === "undefined" || !editorRef.current) return false;
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    if (!anchorNode) return false;
    return editorRef.current.contains(anchorNode);
  };

  const findAncestorTag = (node: Node | null, tagName: string) => {
    let current: Node | null = node;
    while (current && editorRef.current && current !== editorRef.current) {
      if ((current as HTMLElement).tagName === tagName) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  };

  const updateActiveFormats = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!isSelectionInside()) {
      setActiveFormats((prev) => ({
        bold: false,
        italic: false,
        underline: false,
        code: false,
        link: false,
        color: TEXT_COLORS[0].value,
        highlight: "",
        font: FONT_FAMILIES[0].value
      }));
      return;
    }

    const bold = document.queryCommandState("bold");
    const italic = document.queryCommandState("italic");
    const underline = document.queryCommandState("underline");
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode || null;
    const code = findAncestorTag(anchorNode, "CODE");
    const link = findAncestorTag(anchorNode, "A");
    const anchorElement = (anchorNode as HTMLElement)?.nodeType === Node.ELEMENT_NODE
      ? (anchorNode as HTMLElement)
      : anchorNode?.parentElement || null;
    const computedStyle = anchorElement ? window.getComputedStyle(anchorElement) : null;

    setActiveFormats({
      bold,
      italic,
      underline,
      code,
      link,
      color: computedStyle?.color || TEXT_COLORS[0].value,
      highlight:
        computedStyle?.backgroundColor &&
        computedStyle.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        computedStyle.backgroundColor !== "transparent"
          ? computedStyle.backgroundColor
          : "",
      font: computedStyle?.fontFamily || FONT_FAMILIES[0].value
    });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => updateActiveFormats();
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [updateActiveFormats]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const nextValue = editorRef.current.innerHTML.replace(/\u200B/g, "");
    onChange(nextValue);
    updateActiveFormats();
  };

  const exec = (command: string, arg?: string) => {
    if (typeof document === "undefined" || disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    handleInput();
  };

  const insertLink = () => {
    if (typeof window === "undefined" || disabled) return;
    const url = window.prompt("Enter URL");
    if (!url) return;
    exec("createLink", url);
  };

  const insertCode = () => {
    if (typeof document === "undefined" || disabled) return;
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "code";
    document.execCommand("insertHTML", false, `<code>${selectedText}</code>`);
    handleInput();
  };

  const toolbarButtons = [
    { label: "B", title: "Bold", action: () => exec("bold"), key: "bold" as const },
    { label: "I", title: "Italic", action: () => exec("italic"), key: "italic" as const },
    { label: "U", title: "Underline", action: () => exec("underline"), key: "underline" as const },
    { label: "</>", title: "Code", action: insertCode, key: "code" as const },
    { label: "Link", title: "Insert link", action: insertLink, key: "link" as const },
    { label: "Clear", title: "Remove formatting", action: () => exec("removeFormat") }
  ];

  const applyColor = (color: string) => {
    if (typeof document === "undefined" || disabled) return;
    editorRef.current?.focus();
    document.execCommand("foreColor", false, color || TEXT_COLORS[0].value);
    handleInput();
  };

  const applyHighlight = (color: string) => {
    if (typeof document === "undefined" || disabled) return;
    editorRef.current?.focus();
    const command = document.queryCommandSupported("hiliteColor") ? "hiliteColor" : "backColor";
    document.execCommand(command, false, color || "transparent");
    handleInput();
  };

  const applyFont = (font: string) => {
    if (typeof document === "undefined" || disabled) return;
    editorRef.current?.focus();
    document.execCommand("fontName", false, font === "inherit" ? "inherit" : font);
    handleInput();
  };

  const minHeight = Math.max(48, rows * 24);

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-foreground">{label}</label>}
      <div className={`border border-border rounded-xl bg-background ${disabled ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/60">
          <div className="flex flex-wrap gap-1">
            {toolbarButtons.map((button) => {
              const isActive = button.key ? activeFormats[button.key] : false;
              return (
                <button
                  key={button.label}
                  type="button"
                  disabled={disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={button.action}
                  className={`px-2 py-1 text-xs font-semibold rounded transition ${
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  } ${disabled ? "cursor-not-allowed" : ""}`}
                  title={button.title}
                >
                  {button.label}
                </button>
              );
            })}
          </div>

          {variant === "full" && (
            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                Font
                <select
                  disabled={disabled}
                  value={activeFormats.font}
                  onChange={(event) => applyFont(event.target.value)}
                  className="text-xs border border-border rounded px-2 py-1 bg-background"
                >
                  {FONT_FAMILIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                Text
                <select
                  disabled={disabled}
                  value={activeFormats.color}
                  onChange={(event) => applyColor(event.target.value)}
                  className="text-xs border border-border rounded px-2 py-1 bg-background"
                >
                  {TEXT_COLORS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  disabled={disabled}
                  value={activeFormats.color}
                  onChange={(event) => applyColor(event.target.value)}
                  className="w-8 h-6 border border-border rounded"
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                Highlight
                <select
                  disabled={disabled}
                  value={activeFormats.highlight}
                  onChange={(event) => applyHighlight(event.target.value)}
                  className="text-xs border border-border rounded px-2 py-1 bg-background"
                >
                  {HIGHLIGHT_COLORS.map((option) => (
                    <option key={option.value || "none"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  disabled={disabled}
                  value={activeFormats.highlight || "#ffffff"}
                  onChange={(event) => applyHighlight(event.target.value)}
                  className="w-8 h-6 border border-border rounded"
                />
              </label>
            </div>
          )}
        </div>
        <div className="relative">
          {(!value || value === "<p></p>" || value === "<br>") && (
            <span className="absolute left-3 top-3 text-muted-foreground/70 text-sm pointer-events-none">
              {placeholder}
            </span>
          )}
          <div
            ref={editorRef}
            className={`px-3 py-3 text-sm focus:outline-none ${className}`}
            style={{ minHeight }}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={handleInput}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onFocus={updateActiveFormats}
          />
        </div>
      </div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
