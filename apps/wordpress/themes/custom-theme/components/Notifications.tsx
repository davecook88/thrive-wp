import React, { useState, useEffect, useRef } from "react";
import { thriveClient } from "../../../shared/thrive";
import { NotificationDto } from "@thrive/shared";
import "./Notifications.css";

export const Notifications = () => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      thriveClient.fetchNotifications().then((data) => {
        if (data) {
          setNotifications(data);
        }
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = (id: number) => {
    thriveClient.markNotificationAsRead(id).then(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatNotificationType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <div className="thrive-notifications" ref={dropdownRef}>
      <button
        className="thrive-notifications__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
      >
        <svg
          className="thrive-notifications__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="thrive-notifications__badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="thrive-notifications__dropdown">
          <div className="thrive-notifications__header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="thrive-notifications__count">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="thrive-notifications__list">
            {notifications.length === 0 ? (
              <div className="thrive-notifications__empty">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`thrive-notifications__item ${
                    notification.isRead
                      ? "thrive-notifications__item--read"
                      : ""
                  }`}
                >
                  <div className="thrive-notifications__item-indicator" />
                  <div className="thrive-notifications__item-content">
                    <p className="thrive-notifications__item-type">
                      {formatNotificationType(notification.type)}
                    </p>
                    <time className="thrive-notifications__item-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                  </div>
                  {!notification.isRead && (
                    <button
                      className="thrive-notifications__mark-read"
                      onClick={() => handleMarkAsRead(notification.id)}
                      aria-label="Mark as read"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
