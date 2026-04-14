import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

function obterEstiloBadge(variant) {
  switch ((variant || "").toLowerCase()) {
    case "success":
      return styles.badgeSuccess;
    case "warning":
      return styles.badgeWarning;
    case "danger":
      return styles.badgeDanger;
    case "info":
      return styles.badgeInfo;
    default:
      return styles.badgeNeutral;
  }
}

export default function SelectCardList({
  title,
  items,
  selectedId,
  onSelect,
  emptyMessage = "Nenhum item disponível.",
  getTitle,
  getSubtitle,
  getMeta,
  getBadgeText,
  getBadgeVariant,
  isItemDisabled
}) {
  return (
    <View style={styles.container}>
      {!!title && <Text style={styles.title}>{title}</Text>}

      {items.length === 0 ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        items.map((item) => {
          const disabled = isItemDisabled ? isItemDisabled(item) : false;
          const badgeText = getBadgeText ? getBadgeText(item) : "";
          const badgeVariant = getBadgeVariant ? getBadgeVariant(item) : "neutral";
          const meta = getMeta ? getMeta(item) : "";

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.option,
                selectedId === item.id && styles.optionSelected,
                disabled && styles.optionDisabled
              ]}
              onPress={() => !disabled && onSelect(item.id)}
              activeOpacity={disabled ? 1 : 0.8}
              disabled={disabled}
            >
              <View style={styles.headerRow}>
                <Text style={styles.optionTitle}>{getTitle(item)}</Text>

                {!!badgeText && (
                  <View style={[styles.badge, obterEstiloBadge(badgeVariant)]}>
                    <Text style={styles.badgeText}>{badgeText}</Text>
                  </View>
                )}
              </View>

              {!!getSubtitle?.(item) && (
                <Text style={styles.optionSubtitle}>{getSubtitle(item)}</Text>
              )}

              {!!meta && <Text style={styles.optionMeta}>{meta}</Text>}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14
  },
  title: {
    fontWeight: "bold",
    marginBottom: 8
  },
  empty: {
    color: "#666"
  },
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fff"
  },
  optionSelected: {
    borderColor: "#2e86de",
    backgroundColor: "#eaf3ff"
  },
  optionDisabled: {
    opacity: 0.55
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8
  },
  optionTitle: {
    fontWeight: "bold",
    flex: 1
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#555",
    marginTop: 4
  },
  optionMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 6
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "bold"
  },
  badgeNeutral: {
    backgroundColor: "#e5e7eb"
  },
  badgeInfo: {
    backgroundColor: "#dbeafe"
  },
  badgeSuccess: {
    backgroundColor: "#dcfce7"
  },
  badgeWarning: {
    backgroundColor: "#fef3c7"
  },
  badgeDanger: {
    backgroundColor: "#fee2e2"
  }
});