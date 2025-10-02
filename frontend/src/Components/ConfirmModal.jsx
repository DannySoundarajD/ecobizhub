import React from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogDescription } from '@headlessui/react'; // Assuming you use Headless UI for modals

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type }) {
    const confirmButtonClass = type === 'warning' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
                    <DialogTitle as="h3" className="text-lg font-semibold text-gray-900">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-sm text-gray-600">
                        {message}
                    </DialogDescription>

                    <div className="mt-4 flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className={`inline-flex justify-center rounded-md border border-transparent ${confirmButtonClass} px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}

export default ConfirmModal;