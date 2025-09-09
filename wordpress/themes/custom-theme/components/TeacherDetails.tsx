import type { Teacher } from "../types/calendar";

interface TeacherDetailsProps {
  teacher: Teacher;
}

export default function TeacherDetails({ teacher }: TeacherDetailsProps) {
  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "2rem",
          background: "white",
          padding: "2rem",
          borderRadius: "var(--wp--custom--border-radius)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <img
          src={
            (teacher as any)?.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${teacher.name}`
          }
          alt={teacher.name}
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            objectFit: "cover",
            marginRight: "2rem",
            border: "4px solid var(--wp--preset--color--primary)",
          }}
        />
        <div style={{ flex: 1 }}>
          <h2
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "2rem",
              fontWeight: "700",
              color: "var(--wp--preset--color--foreground)",
            }}
          >
            {teacher.name}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <span
              style={{
                color: "#fbbf24",
                fontSize: "1.2rem",
                marginRight: "0.5rem",
              }}
            >
              ⭐⭐⭐⭐⭐
            </span>
            <span
              style={{
                fontWeight: "600",
                color: "var(--wp--preset--color--foreground)",
              }}
            >
              4.9
            </span>
            <span
              style={{
                color: "var(--wp--preset--color--gray-600)",
                marginLeft: "0.5rem",
              }}
            >
              (120 reviews)
            </span>
          </div>
          {teacher.bio && (
            <p
              style={{
                color: "var(--wp--preset--color--gray-600)",
                fontSize: "1rem",
                lineHeight: "1.6",
                margin: 0,
              }}
            >
              {teacher.bio}
            </p>
          )}
        </div>
      </div>

      {/* Teacher Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "var(--wp--custom--border-radius)",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "var(--wp--preset--color--primary)",
              marginBottom: "0.5rem",
            }}
          >
            5+
          </div>
          <div
            style={{
              color: "var(--wp--preset--color--gray-600)",
              fontSize: "0.9rem",
            }}
          >
            Years Teaching
          </div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "var(--wp--custom--border-radius)",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "var(--wp--preset--color--primary)",
              marginBottom: "0.5rem",
            }}
          >
            500+
          </div>
          <div
            style={{
              color: "var(--wp--preset--color--gray-600)",
              fontSize: "0.9rem",
            }}
          >
            Students Taught
          </div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "var(--wp--custom--border-radius)",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "var(--wp--preset--color--primary)",
              marginBottom: "0.5rem",
            }}
          >
            🇲🇽
          </div>
          <div
            style={{
              color: "var(--wp--preset--color--gray-600)",
              fontSize: "0.9rem",
            }}
          >
            Native Speaker
          </div>
        </div>
      </div>

      {/* Specialties */}
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "var(--wp--custom--border-radius)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h3
          style={{
            margin: "0 0 1rem 0",
            fontSize: "1.3rem",
            fontWeight: "600",
            color: "var(--wp--preset--color--foreground)",
          }}
        >
          Specialties
        </h3>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {[
            "Conversational Spanish",
            "Business Spanish",
            "Cultural Immersion",
            "Grammar Focus",
            "Pronunciation",
          ].map((specialty) => (
            <span
              key={specialty}
              style={{
                background: "var(--wp--preset--color--gray-100)",
                color: "var(--wp--preset--color--gray-700)",
                padding: "0.5rem 1rem",
                borderRadius: "var(--wp--custom--border-radius)",
                fontSize: "0.9rem",
                fontWeight: "500",
              }}
            >
              {specialty}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
