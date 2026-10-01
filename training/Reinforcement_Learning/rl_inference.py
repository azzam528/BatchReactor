import pickle
import numpy as np

def load_agent(path="rl_agent_batch_reactor.pkl"):
    with open(path, "rb") as f:
        return pickle.load(f)

def discretize(agent, state):
    cfg = agent["env_config"]
    nilai = [state[0] - cfg["target_temp"], state[1], state[2], state[3], state[4]]
    indices = []
    for val, (low, high), n_bin in zip(nilai, agent["bounds"], agent["n_bins"]):
        normalized = np.clip((val - low) / (high - low), 0, 0.9999)
        indices.append(int(normalized * n_bin))
    return np.ravel_multi_index(indices, agent["n_bins"])

def recommend(agent, state_dict):
    """state_dict: reactor_temp_c, jacket_flow_rate_l_min, pressure_atm,
    reactant_a_conc_mol_l, product_b_conc_mol_l"""
    keys = ["reactor_temp_c", "jacket_flow_rate_l_min", "pressure_atm",
            "reactant_a_conc_mol_l", "product_b_conc_mol_l"]
    hilang = [k for k in keys if k not in state_dict]
    if hilang:
        raise ValueError(f"Field hilang: {hilang}")
    s = np.array([float(state_dict[k]) for k in keys])
    if not np.all(np.isfinite(s)):
        raise ValueError("State tidak valid, simulasi tidak dijalankan")

    cfg = agent["env_config"]
    peringatan = [f"{c} di luar rentang data training"
                  for c, v in zip(agent["state_features"], s)
                  if not (agent["train_ranges"][c][0] <= v <= agent["train_ranges"][c][1])]

    q = agent["q_table"][discretize(agent, s)]
    if q.any():
        aksi = int(np.argmax(q))
    else:
        aksi = 1   # state belum pernah dipelajari -> Maintain
        peringatan.append("State belum pernah dipelajari agen, default Maintain")
    delta = (aksi - 1) * cfg["flow_delta"]
    s_next = s.copy()
    s_next[1] += delta
    s_next[0] -= cfg["k_suhu"] * delta
    error = abs(s_next[0] - cfg["target_temp"])
    reward = -0.5 * error + (1.0 if error <= 2.0 else 0) - (0.05 if aksi != 1 else 0)

    return {
        "recommended_action": {"action_id": aksi, "action_label": agent["action_labels"][aksi]},
        "simulation_result": {"simulated_next_state": dict(zip(keys, map(float, s_next))),
                              "reward": float(reward)},
        "warnings": peringatan,
        "simulation_note": "Hasil berasal dari simulation environment, bukan reactor nyata."}
