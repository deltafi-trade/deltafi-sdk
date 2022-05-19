export type MockPyth = {
  "version": "0.1.0",
  "name": "mock_pyth",
  "instructions": [
    {
      "name": "updatePythPrice",
      "accounts": [
        {
          "name": "pythPrice",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "i64"
        },
        {
          "name": "confidenceInterval",
          "type": "u64"
        }
      ]
    }
  ]
};

export const IDL: MockPyth = {
  "version": "0.1.0",
  "name": "mock_pyth",
  "instructions": [
    {
      "name": "updatePythPrice",
      "accounts": [
        {
          "name": "pythPrice",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "i64"
        },
        {
          "name": "confidenceInterval",
          "type": "u64"
        }
      ]
    }
  ]
};
