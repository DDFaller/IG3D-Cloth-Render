import struct
import json

# Reabrindo o arquivo completo
bcc_path = "glove.bcc"
json_path = "glove.json"
# Definição do cabeçalho com base na estrutura BCCHeader
header_struct = struct.Struct('3s B 2s B B Q Q 40s')

with open(bcc_path, 'rb') as f:
    # Lê e interpreta o cabeçalho
    header_data = f.read(header_struct.size)
    sign, byte_count, curve_type, dimensions, up_dimension, curve_count, total_cp_count, file_info = header_struct.unpack(header_data)

    # Validação básica
    if sign != b'BCC' or byte_count != 0x44 or curve_type != b'C0' or dimensions != 3:
        raise ValueError("Arquivo .bcc inválido ou não suportado.")

    # Preparar para ler os pontos de controle
    control_points = []
    curves = []
    first_cp_index = 0

    for i in range(curve_count):
        # Número de pontos de controle (int32)
        cp_count_raw = f.read(4)
        cp_count = struct.unpack('i', cp_count_raw)[0]
        is_loop = cp_count < 0
        cp_count = abs(cp_count)

        # Ler os pontos de controle da curva
        curve_points = []
        for _ in range(cp_count):
            point_raw = f.read(12)  # 3 floats = 12 bytes
            x, y, z = struct.unpack('fff', point_raw)
            curve_points.append([x, y, z])
            control_points.append([x, y, z])

        curves.append({
            "startIndex": first_cp_index,
            "count": cp_count,
            "loop": is_loop,
            "points": curve_points
        })

        first_cp_index += cp_count

# Salvando os dados como JSON para usar no visualizador React

with open(json_path, 'w') as jf:
    json.dump({
        "curves": curves
    }, jf, indent=2)

json_path
