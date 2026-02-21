graph TD
    %% Flow Description Note (Your added text)
    DescriptionNote["<b>Process Flow:</b><br/>When the user asks any question, it goes to the Principle Agent.<br/>The Principle Agent decides which Parent Agent it should refer to.<br/>Then it goes to the Parent Agent, which chooses which Child to use.<br/>Finally, it goes to the specific Child Agent. The Child performs the action<br/>and gives you the result."]
    
    %% Define the User and final Result
    User((User))
    Result(((Final Result)))

    %% Define the main Principle Agent node
    Principal[Principle Agent]

    %% Define Parent Agents
    P1[Parent Agent 1]
    P2[Parent Agent 2]

    %% Define Child Agents for Parent 1
    P1C1[Child Agent 1]
    P1C2[Child Agent 2]

    %% Define Child Agents for Parent 2
    P2C1[Child Agent 1]
    P2C2[Child Agent 2]

    %% ---- Connections and Flow ----
    %% Link description invisibly so it stays at the top
    DescriptionNote ~~~ User

    %% User to Principle
    User -->|Asks Question| Principal

    %% Principle to Parents
    Principal -->|Decides Parent| P1
    Principal -->|Decides Parent| P2

    %% Parent 1 to its Children
    P1 -->|Chooses Child| P1C1
    P1 -->|Chooses Child| P1C2

    %% Parent 2 to its Children
    P2 -->|Chooses Child| P2C1
    P2 -->|Chooses Child| P2C2
    
    %% Children back to Result
    P1C1 -->|Performs Action & Returns| Result
    P1C2 -->|Performs Action & Returns| Result
    P2C1 -->|Performs Action & Returns| Result
    P2C2 -->|Performs Action & Returns| Result

    %% ---- The Scaling Note ----
    ScaleNote[/"Based on the Architecture we can<br/>Scale it horizontal & vertically."/];

    %% Adding invisible links (~~~) to force the note to appear at the bottom
    Result ~~~ ScaleNote

    %% Optional: Styling the notes to make them look distinct
    style ScaleNote fill:#ffffe0,stroke:#333,stroke-dasharray: 5 5;
    style DescriptionNote fill:#e6f2ff,stroke:#00509e,stroke-width:2px;
    style User fill:#d4edda,stroke:#28a745,stroke-width:2px;
    style Result fill:#d4edda,stroke:#28a745,stroke-width:2px;