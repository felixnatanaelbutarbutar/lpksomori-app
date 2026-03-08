"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
// react-quill-new is a React 18-compatible fork of react-quill (no findDOMNode)
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
    ssr: false,
    loading: () => (
        <div
            className="w-full bg-white border border-gray-200 rounded-2xl"
            style={{ minHeight: "400px" }}
        />
    ),
});

interface RichEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
    className?: string;
}

const modules = {
    toolbar: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ["bold", "italic", "underline", "strike"],
        ["blockquote", "code-block"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ script: "sub" }, { script: "super" }],
        [{ indent: "-1" }, { indent: "+1" }],
        [{ direction: "rtl" }],
        [{ size: ["small", false, "large", "huge"] }],
        [{ color: [] }, { background: [] }],
        [{ font: [] }],
        [{ align: [] }],
        ["link", "image", "video"],
        ["clean"],
    ],
};

const formats = [
    "header",
    "bold", "italic", "underline", "strike", "blockquote", "code-block",
    "list", "bullet", "indent",
    "script", "direction", "size",
    "color", "background",
    "font", "align",
    "link", "image", "video",
];

export default function RichEditor({
    value,
    onChange,
    placeholder = "Tulis isi pengumuman di sini...",
    minHeight = "400px",
    className = "",
}: RichEditorProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div
                className={`w-full bg-white border border-gray-200 rounded-2xl ${className}`}
                style={{ minHeight }}
            />
        );
    }

    return (
        <div
            className={`rich-quill-editor bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
        >
            <ReactQuill
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
                style={{ minHeight }}
                className="font-sans"
            />
        </div>
    );
}
