flowchart TD
    subgraph Overall Profile
        A[Artificial Intelligence & Data Science] --> B(Programming & Tools)
        A --> C(Experience & Projects)
        A --> D(Certifications & Skills)
    end

    subgraph Programming & Tools
        B --> B1[Python]
        B --> B2[MySQL]
        B --> B3[FastAPI]
        B --> B4[Next.js]
        B --> B5[Libraries & Frameworks]

        B5 --> B5a[MUI]
        B5 --> B5b[Pydub-AudioSegment]
        B5 --> B5c[Selenium]
        B5 --> B5d[SpeechRecognition]
        B5 --> B5e[earthengine-api]
        B5 --> B5f[geemap]
        B5 --> B5g[opencv-python]
        B5 --> B5h[torch]
        B5 --> B5i[torchvision]
        B5 --> B5j[pillow]
        B5 --> B5k[livekit]
        B5 --> B5l[google-generativeai]
        B5 --> B5m[MongoDB]
        B5 --> B5n[WEKA]

        style B1,B2,B3,B4 fill:#8dd3c7
        style B5a,B5b,B5c,B5d,B5e,B5f,B5g,B5h,B5i,B5j,B5k,B5l,B5m,B5n fill:#f0f8ff
    end

    subgraph Experience & Projects
        C --> C1[Quantum Developer Intern - Cybrane X]
        C1 --> C1a[Qiskit Integration]
        C1 --> C1b[Next.js Frontend]
        C1 --> C1c[FastAPI Backend]
        C1 --> C1d[Hybrid Optimization Model]
        C --> C2[DCGAN Image Generation]
        C2 --> C2a[Data Augmentation (torchvision)]
        C2 --> C2b[Adversarial Loss Optimization]
        C --> C3[Autonomous Driving & Object Detection]
        C3 --> C3a[YOLOv11 Framework]
        C3 --> C3b[Custom Dataset Labeling]
        C --> C4[Taxi Trip Congestion Prediction]
        C4 --> C4a[geopy Integration]
        C4 --> C4b[Folium Visualization]
        C --> C5[Sentinel-2 Land Cover Classification]
        C5 --> C5a[Random Forest Classifier (scikit-learn)]
        C5 --> C5b[Pixel Value Sampling]

        style C1,C2,C3,C4,C5 fill:#f9e79f
        style C1a,C1b,C1c,C1d,C2a,C2b,C3a,C3b,C4a,C4b,C5a,C5b fill:#e6ffe6
    end

    subgraph Certifications & Skills
        D --> D1[Quantum Computing Seminar]
        D --> D2[AI/ML for Geodata Analysis (ISRO-IIRS)]
        D --> D3[Python for Data Science (NPTEL)]
        D --> D4[Data Science & Business Intelligence]

        style D1,D2,D3,D4 fill:#e6ffe6
    end

    B1 --> B5a
    B1 --> B5g
    B1 --> C2a
    B1 --> C3b
    B1 --> C5b
    B2 --> C4a
    B3 --> C1c
    B4 --> C1b
    C1a --> C1d
    C2a --> C2b
    C3a --> C3b
    C4a --> C4b
    C5a --> C5b