import React, { useCallback } from "react";
import { Link, LinkProps } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";

const CustomLink = (props: Omit<LinkProps, "onFollow">) => {
    const navigate = useNavigate();

    const handleFollow = useCallback(
        (e: Readonly<CustomEvent<Readonly<LinkProps.FollowDetail>>>): void => {
            if (
                e.detail.external === true ||
                typeof e.detail.href === "undefined"
            ) {
                return;
            }

            e.preventDefault();
            navigate(e.detail.href);
        },
        [navigate]
    );

    return <Link onFollow={handleFollow} {...props} />;
};

export default CustomLink;