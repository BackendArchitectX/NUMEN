package ai.numen.service;

import ai.numen.entity.DatasetRecord;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

final class RunChangeAnalyzer {
    private RunChangeAnalyzer() { }

    static Analysis analyze(Set<String> expectedSourceKeys,
                            List<DatasetRecord> currentRecords,
                            List<DatasetRecord> baselineRecords,
                            Set<String> currentObservedSourceKeys,
                            Set<String> baselineObservedSourceKeys) {
        Map<String, List<DatasetRecord>> current = bySourceKey(currentRecords);
        Map<String, List<DatasetRecord>> baseline = bySourceKey(baselineRecords);

        int changed = 0;
        int unchanged = 0;
        int newlyObserved = 0;
        int unobservedCurrent = 0;
        int unhashable = 0;

        for (String sourceKey : expectedSourceKeys) {
            List<DatasetRecord> currentGroup = current.getOrDefault(sourceKey, List.of());
            List<DatasetRecord> baselineGroup = baseline.getOrDefault(sourceKey, List.of());

            if (!currentObservedSourceKeys.contains(sourceKey)) {
                unobservedCurrent++;
                continue;
            }
            if (currentGroup.isEmpty() || !allHashable(currentGroup)) {
                unhashable++;
                continue;
            }
            if (!baselineObservedSourceKeys.contains(sourceKey)) {
                newlyObserved++;
                continue;
            }
            if (baselineGroup.isEmpty() || !allHashable(baselineGroup)) {
                unhashable++;
                continue;
            }
            if (!compatibleHashAlgorithms(currentGroup, baselineGroup)) {
                unhashable++;
                continue;
            }

            if (evidenceHashes(currentGroup).equals(evidenceHashes(baselineGroup))) unchanged++;
            else changed++;
        }

        int compared = changed + unchanged;
        boolean completeObservation = !expectedSourceKeys.isEmpty()
                && compared == expectedSourceKeys.size()
                && newlyObserved == 0
                && unobservedCurrent == 0
                && unhashable == 0;

        return new Analysis(
                expectedSourceKeys.size(),
                compared,
                changed,
                unchanged,
                newlyObserved,
                unobservedCurrent,
                unhashable,
                completeObservation
        );
    }

    private static Map<String, List<DatasetRecord>> bySourceKey(List<DatasetRecord> records) {
        Map<String, List<DatasetRecord>> bySource = new LinkedHashMap<>();
        for (DatasetRecord record : records) {
            String sourceKey = sourceKey(record);
            if (!hasText(sourceKey)) continue;
            bySource.computeIfAbsent(sourceKey, ignored -> new ArrayList<>()).add(record);
        }
        return bySource;
    }

    private static boolean allHashable(List<DatasetRecord> records) {
        return !records.isEmpty() && records.stream()
                .allMatch(record -> hasText(record.getEvidenceHash()) && hasText(record.getEvidenceHashAlgorithm()));
    }

    private static boolean compatibleHashAlgorithms(List<DatasetRecord> current, List<DatasetRecord> baseline) {
        return compatibleHashAlgorithms(
                current.stream().map(DatasetRecord::getEvidenceHashAlgorithm).collect(java.util.stream.Collectors.toSet()),
                baseline.stream().map(DatasetRecord::getEvidenceHashAlgorithm).collect(java.util.stream.Collectors.toSet())
        );
    }

    static boolean compatibleHashAlgorithms(Set<String> currentAlgorithms, Set<String> baselineAlgorithms) {
        return currentAlgorithms.size() == 1
                && baselineAlgorithms.size() == 1
                && currentAlgorithms.equals(baselineAlgorithms)
                && currentAlgorithms.stream().allMatch(RunChangeAnalyzer::hasText);
    }

    private static List<String> evidenceHashes(List<DatasetRecord> records) {
        return records.stream()
                .map(DatasetRecord::getEvidenceHash)
                .sorted()
                .toList();
    }

    static String sourceKey(DatasetRecord record) {
        if (record == null) return "";
        if (hasText(record.getSourceUrl())) return record.getSourceUrl().trim();
        if (hasText(record.getSourceName())) return record.getSourceName().trim();
        return record.getId().toString();
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    record Analysis(
            int expectedSources,
            int comparedSources,
            int changedSources,
            int unchangedSources,
            int newlyObservedSources,
            int unobservedCurrentSources,
            int unhashableSources,
            boolean completeObservation) { }
}
