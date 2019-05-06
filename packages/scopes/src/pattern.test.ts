import t from "ava";
import {
  Pattern,
  AnyMultiple,
  AnySingle,
  getIntersection,
  isSuperset,
  compare
} from "./pattern";

t("compare", t => {
  ([
    { before: [["a"], ["a"]], after: [["a"], ["a"]] },
    { before: [["a"], ["b"]], after: [["a"], ["b"]] },
    { before: [["b"], ["a"]], after: [["a"], ["b"]] },
    { before: [[AnySingle], ["b"]], after: [[AnySingle], ["b"]] },
    { before: [["a"], [AnySingle]], after: [[AnySingle], ["a"]] },
    { before: [[AnyMultiple], ["b"]], after: [[AnyMultiple], ["b"]] },
    { before: [["a"], [AnyMultiple]], after: [[AnyMultiple], ["a"]] },
    {
      before: [[AnyMultiple], [AnySingle]],
      after: [[AnySingle], [AnyMultiple]]
    },
    {
      before: [[AnySingle], [AnyMultiple]],
      after: [[AnySingle], [AnyMultiple]]
    },
    {
      before: [["a"], [AnySingle], [AnyMultiple]],
      after: [[AnySingle], [AnyMultiple], ["a"]]
    },
    {
      before: [["a"], [AnyMultiple], [AnySingle]],
      after: [[AnySingle], [AnyMultiple], ["a"]]
    },
    {
      before: [[AnySingle], ["a"], [AnyMultiple]],
      after: [[AnySingle], [AnyMultiple], ["a"]]
    },
    {
      before: [[AnyMultiple], [AnySingle], ["a"]],
      after: [[AnySingle], [AnyMultiple], ["a"]]
    }
  ] as {
    before: Pattern[];
    after: Pattern[];
  }[]).forEach(({ before, after }) => {
    t.deepEqual(before.sort(compare), after);
  });
});

t("isSuperset(a, b) - a ⊉ a.b", t => {
  t.is(isSuperset(["a"], ["a", "b"]), false);
});
t("isSuperset(a, b) - a.b ⊉ a", t => {
  t.is(isSuperset(["a", "b"], ["a"]), false);
});
t("isSuperset(a, b) - a ⊇ a", t => {
  t.is(isSuperset(["a"], ["a"]), true);
});
t("isSuperset(a, b) - * ⊇ *", t => {
  t.is(isSuperset([AnySingle], ["a"]), true);
});
t("isSuperset(a, b) - * ⊉ a", t => {
  t.is(isSuperset(["a"], [AnySingle]), false);
});
t("isSuperset(a, b) - a ⊉ **", t => {
  t.is(isSuperset(["a"], [AnyMultiple]), false);
});
t("isSuperset(a, b) - ** ⊇ a", t => {
  t.is(isSuperset([AnyMultiple], ["a"]), true);
});
t("isSuperset(a, b) - ** ⊇ a.b", t => {
  t.is(isSuperset([AnyMultiple], ["a", "b"]), true);
});
t("isSuperset(a, b) - ** ⊇ *", t => {
  t.is(isSuperset([AnyMultiple], [AnySingle]), true);
});
t("isSuperset(a, b) - * ⊉ **", t => {
  t.is(isSuperset([AnySingle], [AnyMultiple]), false);
});
t("isSuperset(a, b) - **.b ⊉ a.**", t => {
  t.is(isSuperset([AnyMultiple, "b"], ["a", AnyMultiple]), false);
});
t("isSuperset(a, b) - a.** ⊉ **.b", t => {
  t.is(isSuperset(["a", AnyMultiple], [AnyMultiple, "b"]), false);
});
t("isSuperset(a, b) - a.**.b ⊉ a.b", t => {
  t.is(isSuperset(["a", AnyMultiple, "b"], ["a", "b"]), false);
});
t("isSuperset(a, b) - a.b ⊉ a.**.b", t => {
  t.is(isSuperset(["a", "b"], ["a", AnyMultiple, "b"]), false);
});

t("getIntersection(a, b) - should find intersection of equal literals", t => {
  t.deepEqual(getIntersection(["a"], ["a"]), [["a"]]);
});
t(
  "getIntersection(a, b) - should not find intersection of unequal literals",
  t => {
    t.deepEqual(getIntersection(["a"], ["b"]), []);
  }
);
t(
  "getIntersection(a, b) - should not find intersection of patterns of different cardinality (a < b)",
  t => {
    t.deepEqual(getIntersection(["a"], ["a", "b"]), []);
  }
);
t(
  "getIntersection(a, b) - should not find intersection of patterns of different cardinality (a > b)",
  t => {
    t.deepEqual(getIntersection(["a", "b"], ["b"]), []);
  }
);
t(
  "getIntersection(a, b) - should find intersection of multi-segment patterns",
  t => {
    t.deepEqual(getIntersection(["a", "b", "c"], ["a", "b", "c"]), [
      ["a", "b", "c"]
    ]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnySingle with a literal (* ∩ a)",
  t => {
    t.deepEqual(getIntersection([AnySingle], ["a"]), [["a"]]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnySingle with a literal (a ∩ *)",
  t => {
    t.deepEqual(getIntersection(["a"], [AnySingle]), [["a"]]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnySingle and AnySingle",
  t => {
    t.deepEqual(getIntersection([AnySingle], [AnySingle]), [[AnySingle]]);
  }
);
t(
  "getIntersection(a, b) - should not find intersection of patterns of different cardinality (* ∩ a.b)",
  t => {
    t.deepEqual(getIntersection([AnySingle], ["a", "b"]), []);
  }
);
t(
  "getIntersection(a, b) - should not find intersection of patterns of different cardinality (a ∩ *.b)",
  t => {
    t.deepEqual(getIntersection(["a"], [AnySingle, "b"]), []);
  }
);
t(
  "getIntersection(a, b) - should not find intersection of patterns of different cardinality (a ∩ a.*)",
  t => {
    t.deepEqual(getIntersection(["a"], ["a", AnySingle]), []);
  }
);
t(
  "getIntersection(a, b) - should find intersection of multi-segment patterns (*.b.c ∩ a.b.c)",
  t => {
    t.deepEqual(getIntersection([AnySingle, "b", "c"], ["a", "b", "c"]), [
      ["a", "b", "c"]
    ]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of multi-segment patterns (a.*.c ∩ a.b.c)",
  t => {
    t.deepEqual(getIntersection(["a", AnySingle, "c"], ["a", "b", "c"]), [
      ["a", "b", "c"]
    ]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of multi-segment patterns (a.b.* ∩ a.b.c)",
  t => {
    t.deepEqual(getIntersection(["a", "b", AnySingle], ["a", "b", "c"]), [
      ["a", "b", "c"]
    ]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of multi-segment patterns (*.b.c ∩ *.b.c)",
  t => {
    t.deepEqual(getIntersection([AnySingle, "b", "c"], [AnySingle, "b", "c"]), [
      [AnySingle, "b", "c"]
    ]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with a literal (** ∩ a)",
  t => {
    t.deepEqual(getIntersection([AnyMultiple], ["a"]), [["a"]]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with a literal (a ∩ **)",
  t => {
    t.deepEqual(getIntersection(["a"], [AnyMultiple]), [["a"]]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with a AnySingle (** ∩ *)",
  t => {
    t.deepEqual(getIntersection([AnyMultiple], [AnySingle]), [[AnySingle]]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with a AnySingle (* ∩ **)",
  t => {
    t.deepEqual(getIntersection([AnySingle], [AnyMultiple]), [[AnySingle]]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with a AnyMultiple",
  t => {
    t.deepEqual(getIntersection([AnyMultiple], [AnyMultiple]), [[AnyMultiple]]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with more than one AnyMultiple (* ∩ **)",
  t => {
    t.deepEqual(getIntersection([AnyMultiple], [AnyMultiple, AnyMultiple]), [
      [AnySingle, AnyMultiple]
    ]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with more than one AnyMultiple (** ∩ *)",
  t => {
    t.deepEqual(getIntersection([AnyMultiple], [AnyMultiple, AnyMultiple]), [
      [AnySingle, AnyMultiple]
    ]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with a left constraint",
  t => {
    t.deepEqual(getIntersection([AnyMultiple], ["a", AnyMultiple]), [
      ["a", AnyMultiple]
    ]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with a right constraint",
  t => {
    t.deepEqual(getIntersection([AnyMultiple], [AnyMultiple, "b"]), [
      [AnyMultiple, "b"]
    ]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with left and right constraints",
  t => {
    t.deepEqual(getIntersection([AnyMultiple], ["a", AnyMultiple, "b"]), [
      ["a", AnyMultiple, "b"]
    ]);
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with a center constraint",
  t => {
    t.deepEqual(
      getIntersection([AnyMultiple], [AnyMultiple, "b", AnyMultiple]),
      [[AnyMultiple, "b", AnyMultiple]]
    );
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with opposing constraints",
  t => {
    t.deepEqual(
      getIntersection([AnyMultiple, "b"], ["a", AnyMultiple]).sort(compare),
      [["a", AnyMultiple, "b"], ["a", "b"]]
    );
  }
);
t(
  "getIntersection(a, b) - should find intersection of AnyMultiple with staggered constraints",
  t => {
    t.deepEqual(
      getIntersection(
        [AnyMultiple, "b", AnyMultiple],
        [AnyMultiple, "a", AnyMultiple]
      ).sort(compare),
      [
        [AnyMultiple, "a", AnyMultiple, "b", AnyMultiple],
        [AnyMultiple, "a", "b", AnyMultiple],
        [AnyMultiple, "b", AnyMultiple, "a", AnyMultiple],
        [AnyMultiple, "b", "a", AnyMultiple]
      ]
    );
  }
);
