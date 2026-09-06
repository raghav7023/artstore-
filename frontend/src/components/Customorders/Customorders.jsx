import Navbar from "../Navbar/Navbar";
import "./Customorders.css";

export default function Customorders() {
    const instagramUrl = "https://www.instagram.com/artstore_07?stkn=MWJmY294N2d2bWVveA==";

    return (
        <div className="custom-page">
            <Navbar />

            <div className="custom-container">
                <div className="custom-info-box">
                    <h1 className="custom-title">✨ Looking for something personalized?</h1>

                    <p className="custom-description">
                        Place your Custom Order by sending us a DM on Instagram or through the link below. 💌
                    </p>

                    <p className="custom-tagline">
                        Your idea, beautifully crafted just for you. ❤️
                    </p>

                    <div className="custom-contact-card">
                        <p className="custom-contact-row">
                            <span className="contact-icon">📩</span>
                            <strong>Instagram:</strong>{" "}
                            <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="custom-link custom-ig-username"
                            >
                                @artstore_07
                            </a>
                        </p>

                        <p className="custom-contact-row">
                            <span className="contact-icon">🔗</span>{" "}
                            <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="custom-link custom-full-url"
                            >
                                https://www.instagram.com/artstore_07?stkn=MWJmY294N2d2bWVveA==
                            </a>
                        </p>
                    </div>

                    <div className="custom-cta-wrap">
                        <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="custom-cta-btn"
                        >
                            💌 DM on Instagram
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}